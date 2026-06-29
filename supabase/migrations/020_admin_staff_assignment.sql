-- Fix admin staff list to return correct block/gate assignment per role

CREATE OR REPLACE FUNCTION public.get_admin_staff_list(p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_type TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_assignment_type := CASE p_role
    WHEN 'warden' THEN 'block'
    WHEN 'security_guard' THEN 'gate'
    ELSE NULL
  END;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.full_name), '[]'::json)
    FROM (
      SELECT
        p.id,
        p.full_name,
        p.phone,
        p.role::text,
        u.email,
        u.last_sign_in_at,
        sa.assignment_value,
        (
          SELECT COUNT(*)::int FROM public.gate_logs gl
          WHERE gl.scanned_by = p.id
            AND gl.scanned_at >= date_trunc('day', now())
        ) AS scans_today
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      LEFT JOIN public.staff_assignments sa
        ON sa.profile_id = p.id
        AND sa.assignment_type = v_assignment_type
      WHERE p.role::text = p_role
    ) s
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_staff_list(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
