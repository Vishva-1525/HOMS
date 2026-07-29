-- Admin dashboard: approved_today metric + period stats total_requests

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_today_ist DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.refresh_outpass_overdue_flags();

  SELECT json_build_object(
    'total_students', (SELECT COUNT(*)::int FROM public.students WHERE is_active = true),
    'active_outpasses', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE status IN ('approved', 'extended')
        AND departure_at <= now()
        AND return_by >= now()
    ),
    'currently_outside', (
      SELECT COUNT(*)::int
      FROM public.student_campus_status
      WHERE current_status = 'outside'
    ),
    'overdue_returns', (
      SELECT COUNT(*)::int
      FROM public.student_campus_status
      WHERE current_status = 'overdue'
    ),
    'pending_approval', (
      SELECT COUNT(*)::int FROM public.outpass_requests WHERE status = 'pending'
    ),
    'approved_today', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE status IN ('approved', 'extended')
        AND approved_at IS NOT NULL
        AND (approved_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ),
    'passes_this_month', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE created_at >= date_trunc('month', now())
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_period_stats(p_period TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_total INT;
  v_pending INT;
  v_approved INT;
  v_rejected INT;
  v_overdue INT;
BEGIN
  IF public.current_user_role() NOT IN ('admin', 'warden') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_start := CASE p_period
    WHEN 'weekly' THEN date_trunc('week', now())
    WHEN 'yearly' THEN date_trunc('year', now())
    ELSE date_trunc('month', now())
  END;

  SELECT COUNT(*)::int INTO v_total
  FROM public.outpass_requests
  WHERE created_at >= v_start;

  SELECT COUNT(*)::int INTO v_pending
  FROM public.outpass_requests
  WHERE created_at >= v_start AND status = 'pending';

  SELECT COUNT(*)::int INTO v_approved
  FROM public.outpass_requests
  WHERE created_at >= v_start AND status IN ('approved', 'extended');

  SELECT COUNT(*)::int INTO v_rejected
  FROM public.outpass_requests
  WHERE created_at >= v_start AND status = 'rejected';

  SELECT COUNT(*)::int INTO v_overdue
  FROM public.outpass_requests o
  WHERE o.created_at >= v_start
    AND o.status IN ('approved', 'extended')
    AND o.return_by < now()
    AND NOT EXISTS (
      SELECT 1
      FROM public.gate_logs gl
      WHERE gl.outpass_id = o.id
        AND gl.event_type = 'entry'
    );

  RETURN json_build_object(
    'period', p_period,
    'period_start', v_start,
    'total', v_total,
    'pending', v_pending,
    'approved', v_approved,
    'rejected', v_rejected,
    'overdue', v_overdue
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
