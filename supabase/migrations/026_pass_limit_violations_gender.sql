-- Include student gender in pass-limit violations for warden scoping

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
        s.gender::text AS gender,
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
