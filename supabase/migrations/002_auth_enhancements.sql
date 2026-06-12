-- Auth enhancements: password_changed, student login lookup, OTP reset

ALTER TABLE public.profiles
  ADD COLUMN password_changed BOOLEAN NOT NULL DEFAULT false;

-- Non-student accounts created by admin should start with password_changed = true
UPDATE public.profiles
SET password_changed = true
WHERE role <> 'student';

-- ---------------------------------------------------------------------------
-- Student login: resolve auth email from register number (anon-safe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_student_login_email(reg_number_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_email TEXT;
BEGIN
  SELECT u.email INTO resolved_email
  FROM public.students s
  JOIN auth.users u ON u.id = s.id
  WHERE lower(trim(s.reg_number)) = lower(trim(reg_number_input))
  LIMIT 1;

  IF resolved_email IS NULL THEN
    RAISE EXCEPTION 'No student found with that register number';
  END IF;

  RETURN resolved_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_login_email(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Student forgot-password OTP storage
-- ---------------------------------------------------------------------------

CREATE TABLE public.password_reset_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_otps_student_id ON public.password_reset_otps (student_id);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions access OTP rows (no client policies)

-- ---------------------------------------------------------------------------
-- Update signup trigger: set password_changed by role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'student'
  );

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

-- Students may update their own password_changed flag after first login
CREATE POLICY "Students can mark password changed"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() AND role = 'student')
  WITH CHECK (id = auth.uid() AND role = 'student');
