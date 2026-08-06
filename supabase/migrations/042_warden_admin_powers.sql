-- Give wardens admin-equivalent powers except system settings and bulk student import.
-- Bulk import stays admin-only via edge function + UI; system_settings RLS unchanged.

CREATE OR REPLACE FUNCTION public.is_admin_or_warden()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'warden');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_warden() TO authenticated;

-- Staff directory (SECURITY DEFINER)
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
  IF NOT public.is_admin_or_warden() THEN
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

-- Students: wardens may update (edit / deactivate); insert/delete remain admin-only via existing ALL policy.
DROP POLICY IF EXISTS "Wardens can update students" ON public.students;
CREATE POLICY "Wardens can update students"
  ON public.students FOR UPDATE
  USING (public.current_user_role() = 'warden')
  WITH CHECK (public.current_user_role() = 'warden');

-- Profiles: wardens may update student name/phone (not other staff/admin profiles).
DROP POLICY IF EXISTS "Wardens can update student profiles" ON public.profiles;
CREATE POLICY "Wardens can update student profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.current_user_role() = 'warden'
    AND role = 'student'
  )
  WITH CHECK (
    public.current_user_role() = 'warden'
    AND role = 'student'
  );

-- Staff assignments: wardens can manage block/gate assignments like admins.
DROP POLICY IF EXISTS "Admins can manage staff assignments" ON public.staff_assignments;
CREATE POLICY "Admins and wardens can manage staff assignments"
  ON public.staff_assignments FOR ALL
  USING (public.is_admin_or_warden())
  WITH CHECK (public.is_admin_or_warden());

NOTIFY pgrst, 'reload schema';
