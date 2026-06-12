-- HOMS: Hostel Outpass Management System — initial schema
-- Sri Venkateswara College of Engineering (SVCE)

-- ---------------------------------------------------------------------------
-- Custom types
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'student',
  'warden',
  'security_guard',
  'parent',
  'admin'
);

CREATE TYPE public.pass_type AS ENUM ('outpass', 'staypass', 'night_pass');

CREATE TYPE public.outpass_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'extended'
);

CREATE TYPE public.extension_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.gate_event_type AS ENUM ('exit', 'entry');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role       public.user_role NOT NULL DEFAULT 'student',
  full_name  TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id             UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  reg_number     TEXT NOT NULL UNIQUE,
  room_number    TEXT NOT NULL DEFAULT '',
  hostel_block   TEXT NOT NULL DEFAULT '',
  date_of_birth  DATE,
  parent_phone   TEXT NOT NULL DEFAULT '',
  parent_email   TEXT NOT NULL DEFAULT '',
  department     TEXT NOT NULL DEFAULT '',
  year_of_study  INT NOT NULL DEFAULT 1
);

CREATE TABLE public.outpass_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  pass_type     public.pass_type NOT NULL,
  destination   TEXT NOT NULL,
  reason        TEXT NOT NULL,
  departure_at  TIMESTAMPTZ NOT NULL,
  return_by     TIMESTAMPTZ NOT NULL,
  status        public.outpass_status NOT NULL DEFAULT 'pending',
  warden_remark TEXT,
  approved_by   UUID REFERENCES public.profiles (id),
  qr_code_data  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gate_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpass_id  UUID NOT NULL REFERENCES public.outpass_requests (id) ON DELETE CASCADE,
  scanned_by  UUID NOT NULL REFERENCES public.profiles (id),
  event_type  public.gate_event_type NOT NULL,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.extension_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpass_id      UUID NOT NULL REFERENCES public.outpass_requests (id) ON DELETE CASCADE,
  new_return_time TIMESTAMPTZ NOT NULL,
  reason          TEXT NOT NULL,
  status          public.extension_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_outpass_requests_student_id ON public.outpass_requests (student_id);
CREATE INDEX idx_outpass_requests_status ON public.outpass_requests (status);
CREATE INDEX idx_gate_logs_outpass_id ON public.gate_logs (outpass_id);
CREATE INDEX idx_extension_requests_outpass_id ON public.extension_requests (outpass_id);
CREATE INDEX idx_students_parent_phone ON public.students (parent_phone);
CREATE INDEX idx_students_parent_email ON public.students (parent_email);

-- ---------------------------------------------------------------------------
-- Auth trigger: auto-create profile on signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = student_uuid
      AND p.role = 'parent'
      AND (
        (p.phone <> '' AND s.parent_phone = p.phone)
        OR (
          s.parent_email <> ''
          AND s.parent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outpass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_requests ENABLE ROW LEVEL SECURITY;

-- profiles -----------------------------------------------------------------

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- students -----------------------------------------------------------------

CREATE POLICY "Students can read own record"
  ON public.students FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('warden', 'admin')
    OR public.is_parent_of_student(id)
  );

CREATE POLICY "Admins can manage students"
  ON public.students FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- outpass_requests ---------------------------------------------------------

CREATE POLICY "Students can read own outpass requests"
  ON public.outpass_requests FOR SELECT
  USING (
    student_id = public.current_student_id()
    OR public.current_user_role() IN ('warden', 'admin')
    OR (
      public.current_user_role() = 'security_guard'
      AND status = 'approved'
    )
    OR public.is_parent_of_student(student_id)
  );

CREATE POLICY "Students can insert own outpass requests"
  ON public.outpass_requests FOR INSERT
  WITH CHECK (student_id = public.current_student_id());

CREATE POLICY "Students can update own pending outpass requests"
  ON public.outpass_requests FOR UPDATE
  USING (
    (student_id = public.current_student_id() AND status = 'pending')
    OR public.current_user_role() = 'warden'
    OR public.is_admin()
  );

CREATE POLICY "Admins can delete outpass requests"
  ON public.outpass_requests FOR DELETE
  USING (public.is_admin());

-- gate_logs ----------------------------------------------------------------

CREATE POLICY "Authorized roles can read gate logs"
  ON public.gate_logs FOR SELECT
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('warden', 'security_guard')
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.student_id = public.current_student_id()
    )
  );

CREATE POLICY "Security guards can insert gate logs"
  ON public.gate_logs FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'security_guard'
    AND scanned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage gate logs"
  ON public.gate_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- extension_requests -------------------------------------------------------

CREATE POLICY "Students can read own extension requests"
  ON public.extension_requests FOR SELECT
  USING (
    public.is_admin()
    OR public.current_user_role() = 'warden'
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.student_id = public.current_student_id()
    )
  );

CREATE POLICY "Students can insert extension requests for own outpasses"
  ON public.extension_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.student_id = public.current_student_id()
    )
  );

CREATE POLICY "Wardens and admins can update extension requests"
  ON public.extension_requests FOR UPDATE
  USING (public.current_user_role() IN ('warden', 'admin'));

CREATE POLICY "Admins can delete extension requests"
  ON public.extension_requests FOR DELETE
  USING (public.is_admin());
