-- Server-side integrity for profiles, outpass requests and extension requests.
-- Row triggers only act on direct client writes (current_user authenticated/anon);
-- SECURITY DEFINER functions, service_role and the dashboard are unaffected.

-- ---------------------------------------------------------------------------
-- New auth users: privileged roles only come from app_metadata (service role)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested TEXT;
  user_role public.user_role;
BEGIN
  requested := NULLIF(NEW.raw_app_meta_data->>'role', '');

  IF requested IS NULL THEN
    requested := NULLIF(NEW.raw_user_meta_data->>'role', '');
    IF requested IS DISTINCT FROM 'student' THEN
      requested := NULL;
    END IF;
  END IF;

  user_role := COALESCE(requested::public.user_role, 'student');

  INSERT INTO public.profiles (id, role, full_name, phone, password_changed)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN user_role = 'student' THEN false
      ELSE COALESCE((NEW.raw_user_meta_data->>'password_changed')::BOOLEAN, true)
    END
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_profiles_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'permission denied for table profiles' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.gender IS DISTINCT FROM OLD.gender
    OR NEW.warden_tier IS DISTINCT FROM OLD.warden_tier
    OR NEW.is_available IS DISTINCT FROM OLD.is_available
    OR NEW.unavailable_reason IS DISTINCT FROM OLD.unavailable_reason
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR (OLD.role = 'parent' AND NEW.phone IS DISTINCT FROM OLD.phone)
  THEN
    RAISE EXCEPTION 'permission denied for table profiles' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_integrity ON public.profiles;
CREATE TRIGGER profiles_integrity
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_integrity();

-- ---------------------------------------------------------------------------
-- outpass_requests (trigger name sorts before outpass_pass_rules so that
-- allows_multi_daily_scan is still derived from pass_type afterwards)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_outpass_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon')
    OR public.current_user_role() IN ('warden', 'admin')
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.warden_remark := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.qr_code_data := NULL;
    NEW.entry_code := NULL;
    NEW.is_overdue := false;
    NEW.admin_override_note := NULL;
    NEW.allows_multi_daily_scan := false;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  NEW.id := OLD.id;
  NEW.student_id := OLD.student_id;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    SELECT 'Cancelled by ' || COALESCE(NULLIF(trim(p.full_name), ''), 'student')
    INTO NEW.warden_remark
    FROM public.profiles p
    WHERE p.id = auth.uid();
  ELSE
    NEW.warden_remark := OLD.warden_remark;
  END IF;

  NEW.approved_by := OLD.approved_by;
  NEW.approved_at := OLD.approved_at;
  NEW.qr_code_data := OLD.qr_code_data;
  NEW.entry_code := OLD.entry_code;
  NEW.is_overdue := OLD.is_overdue;
  NEW.admin_override_note := OLD.admin_override_note;
  NEW.allows_multi_daily_scan := OLD.allows_multi_daily_scan;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS outpass_integrity ON public.outpass_requests;
CREATE TRIGGER outpass_integrity
  BEFORE INSERT OR UPDATE ON public.outpass_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_outpass_integrity();

-- ---------------------------------------------------------------------------
-- extension_requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_extension_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon')
    OR public.current_user_role() IN ('warden', 'admin')
  THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extension_integrity ON public.extension_requests;
CREATE TRIGGER extension_integrity
  BEFORE INSERT ON public.extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_extension_integrity();

-- ---------------------------------------------------------------------------
-- Staff directory: admin accounts are listed to admins only
-- ---------------------------------------------------------------------------

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

  IF p_role = 'admin' AND NOT public.is_admin() THEN
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
