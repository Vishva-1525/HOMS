-- Student module enhancements: special pass, academic calendar, pass quotas

-- ---------------------------------------------------------------------------
-- Enums & columns
-- ---------------------------------------------------------------------------

ALTER TYPE public.pass_type ADD VALUE IF NOT EXISTS 'special_pass';

DO $$ BEGIN
  CREATE TYPE public.special_pass_purpose AS ENUM (
    'internship',
    'hackathon',
    'sports_event',
    'industrial_visit', 
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.academic_day_type AS ENUM (
    'holiday',
    'working_day',
    'exam_day',
    'study_holiday'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS special_purpose public.special_pass_purpose,
  ADD COLUMN IF NOT EXISTS special_remarks TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS requires_hod_approval BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.extension_requests
  ADD COLUMN IF NOT EXISTS additional_duration_hours INT;

-- ---------------------------------------------------------------------------
-- Academic calendar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academic_calendar (
  calendar_date DATE PRIMARY KEY,
  day_type      public.academic_day_type NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_day_type
  ON public.academic_calendar (day_type);

-- Seed: mark Mon–Fri as working days, Sat–Sun as holidays for next 120 days
INSERT INTO public.academic_calendar (calendar_date, day_type, label)
SELECT
  d::date,
  CASE
    WHEN EXTRACT(ISODOW FROM d) IN (6, 7) THEN 'holiday'::public.academic_day_type
    ELSE 'working_day'::public.academic_day_type
  END,
  CASE
    WHEN EXTRACT(ISODOW FROM d) IN (6, 7) THEN 'Weekend'
    ELSE 'Working day'
  END
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 120, '1 day'::interval) AS d
ON CONFLICT (calendar_date) DO NOTHING;

-- Sample exam / study-holiday markers (adjust in admin later)
INSERT INTO public.academic_calendar (calendar_date, day_type, label) VALUES
  (CURRENT_DATE + 14, 'exam_day', 'Mid-semester exams'),
  (CURRENT_DATE + 15, 'exam_day', 'Mid-semester exams'),
  (CURRENT_DATE + 21, 'study_holiday', 'Study leave')
ON CONFLICT (calendar_date) DO UPDATE
  SET day_type = EXCLUDED.day_type,
      label = EXCLUDED.label;

-- ---------------------------------------------------------------------------
-- Pass quota settings
-- ---------------------------------------------------------------------------

INSERT INTO public.system_settings (key, value) VALUES
  ('max_weekly_passes', '2'),
  ('max_monthly_passes', '5')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RPC: student pass quotas
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: academic calendar range (students + staff)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_academic_calendar(p_start DATE, p_end DATE)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'calendar_date', calendar_date,
        'day_type', day_type,
        'label', label
      )
      ORDER BY calendar_date
    ),
    '[]'::json
  )
  FROM public.academic_calendar
  WHERE calendar_date BETWEEN p_start AND p_end;
$$;

GRANT EXECUTE ON FUNCTION public.get_academic_calendar(DATE, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: readable pass limits for students (subset of system_settings)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_student_pass_limits()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_object_agg(key, value)
  FROM public.system_settings
  WHERE key IN (
    'max_weekly_passes',
    'max_monthly_passes',
    'max_outpass_hours',
    'max_staypass_days',
    'max_night_pass_hours'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_student_pass_limits() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: academic calendar
-- ---------------------------------------------------------------------------

ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read academic calendar" ON public.academic_calendar;
CREATE POLICY "Authenticated users can read academic calendar"
  ON public.academic_calendar FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage academic calendar" ON public.academic_calendar;
CREATE POLICY "Admins can manage academic calendar"
  ON public.academic_calendar FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: special pass documents
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'special-pass-documents',
  'special-pass-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students upload own special pass docs" ON storage.objects;
CREATE POLICY "Students upload own special pass docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'special-pass-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students read own special pass docs" ON storage.objects;
CREATE POLICY "Students read own special pass docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'special-pass-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff read special pass docs" ON storage.objects;
CREATE POLICY "Staff read special pass docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'special-pass-documents'
    AND public.current_user_role() IN ('warden', 'admin')
  );

NOTIFY pgrst, 'reload schema';