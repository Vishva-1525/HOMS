-- Fix pass quota limits and counting: monthly max 5, count approved passes only

UPDATE public.system_settings
SET value = '5'
WHERE key = 'max_monthly_passes';

INSERT INTO public.system_settings (key, value) VALUES
  ('max_monthly_passes', '5')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.get_student_pass_quotas(p_student_id UUID)
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
  v_weekly_used INT;
  v_monthly_used INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_student_id THEN
    IF public.current_user_role() NOT IN ('warden', 'admin') THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  SELECT COALESCE(value::int, 2) INTO v_weekly_limit
  FROM public.system_settings WHERE key = 'max_weekly_passes';

  SELECT COALESCE(value::int, 5) INTO v_monthly_limit
  FROM public.system_settings WHERE key = 'max_monthly_passes';

  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  v_month_start := date_trunc('month', CURRENT_DATE)::date;

  SELECT COUNT(*)::int INTO v_weekly_used
  FROM public.outpass_requests
  WHERE student_id = p_student_id
    AND status IN ('approved', 'extended')
    AND COALESCE(approved_at, created_at) >= v_week_start::timestamptz;

  SELECT COUNT(*)::int INTO v_monthly_used
  FROM public.outpass_requests
  WHERE student_id = p_student_id
    AND status IN ('approved', 'extended')
    AND COALESCE(approved_at, created_at) >= v_month_start::timestamptz;

  RETURN json_build_object(
    'weekly_limit', v_weekly_limit,
    'monthly_limit', v_monthly_limit,
    'weekly_used', v_weekly_used,
    'monthly_used', v_monthly_used,
    'weekly_remaining', GREATEST(0, v_weekly_limit - v_weekly_used),
    'monthly_remaining', GREATEST(0, v_monthly_limit - v_monthly_used),
    'week_start', v_week_start,
    'month_start', v_month_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_pass_quotas(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
