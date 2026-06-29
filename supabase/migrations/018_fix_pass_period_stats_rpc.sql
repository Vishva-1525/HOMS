-- Fix RT/Admin pass statistics RPC: STABLE functions cannot run UPDATE.
-- get_pass_period_stats called refresh_outpass_overdue_flags() which updates rows.

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

  -- Compute overdue inline (no UPDATE) — past return with no gate entry
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

NOTIFY pgrst, 'reload schema';
