-- Admin / RT (warden) dashboard enhancements

-- ---------------------------------------------------------------------------
-- Period pass statistics (admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pass_period_stats(p_period TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
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
    'pending', v_pending,
    'approved', v_approved,
    'rejected', v_rejected,
    'overdue', v_overdue
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pass_period_stats(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Pass limit violations (admin + warden)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pass_limit_violations()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekly_limit INT;
  v_monthly_limit INT;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  IF public.current_user_role() NOT IN ('admin', 'warden') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(value::int, 2) INTO v_weekly_limit
  FROM public.system_settings WHERE key = 'max_weekly_passes';

  SELECT COALESCE(value::int, 5) INTO v_monthly_limit
  FROM public.system_settings WHERE key = 'max_monthly_passes';

  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  v_month_start := date_trunc('month', CURRENT_DATE)::date;

  RETURN COALESCE((
    SELECT json_agg(row_to_json(t) ORDER BY t.student_name)
    FROM (
      SELECT
        s.id AS student_id,
        s.reg_number,
        p.full_name AS student_name,
        s.hostel_block,
        wk.cnt AS weekly_used,
        v_weekly_limit AS weekly_limit,
        mo.cnt AS monthly_used,
        v_monthly_limit AS monthly_limit,
        (wk.cnt > v_weekly_limit) AS weekly_exceeded,
        (mo.cnt > v_monthly_limit) AS monthly_exceeded
      FROM public.students s
      JOIN public.profiles p ON p.id = s.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM public.outpass_requests o
        WHERE o.student_id = s.id
          AND o.status IN ('pending', 'approved', 'extended')
          AND o.created_at >= v_week_start::timestamptz
      ) wk ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM public.outpass_requests o
        WHERE o.student_id = s.id
          AND o.status IN ('pending', 'approved', 'extended')
          AND o.created_at >= v_month_start::timestamptz
      ) mo ON true
      WHERE s.is_active = true
        AND (wk.cnt > v_weekly_limit OR mo.cnt > v_monthly_limit)
    ) t
  ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pass_limit_violations() TO authenticated;

NOTIFY pgrst, 'reload schema';
