-- Security module: entry codes, QR availability setting, duplicate scan prevention

-- ---------------------------------------------------------------------------
-- Entry code on approved passes
-- ---------------------------------------------------------------------------

ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS entry_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outpass_requests_entry_code
  ON public.outpass_requests (entry_code)
  WHERE entry_code IS NOT NULL;

INSERT INTO public.system_settings (key, value) VALUES
  ('qr_availability_minutes', '30')
ON CONFLICT (key) DO NOTHING;

-- Backfill entry codes for existing approved passes
UPDATE public.outpass_requests
SET entry_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE entry_code IS NULL
  AND status IN ('approved', 'extended');

-- ---------------------------------------------------------------------------
-- Prevent duplicate exit/entry per pass (one of each)
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_one_exit_per_pass
  ON public.gate_logs (outpass_id)
  WHERE event_type = 'exit';

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_one_entry_per_pass
  ON public.gate_logs (outpass_id)
  WHERE event_type = 'entry';

-- ---------------------------------------------------------------------------
-- Extend student-readable settings with QR window
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
    'max_night_pass_hours',
    'qr_availability_minutes'
  );
$$;

-- Lookup pass by entry code (security guards)
CREATE OR REPLACE FUNCTION public.get_outpass_id_by_entry_code(p_entry_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.outpass_requests
  WHERE upper(trim(entry_code)) = upper(trim(p_entry_code))
    AND status IN ('approved', 'extended')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_outpass_id_by_entry_code(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
