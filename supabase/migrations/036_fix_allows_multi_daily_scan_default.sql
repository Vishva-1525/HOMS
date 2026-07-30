-- Ensure allows_multi_daily_scan is never null on insert (fixes student pass create errors).
ALTER TABLE public.outpass_requests
  ALTER COLUMN allows_multi_daily_scan SET DEFAULT false;

UPDATE public.outpass_requests
SET allows_multi_daily_scan = COALESCE(allows_multi_daily_scan, false)
WHERE allows_multi_daily_scan IS NULL;

ALTER TABLE public.outpass_requests
  ALTER COLUMN allows_multi_daily_scan SET NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_outpass_pass_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_hours NUMERIC;
  v_days INTEGER;
  v_max_outpass_hours NUMERIC;
  v_max_special_days INTEGER;
  v_max_internship_days INTEGER;
BEGIN
  IF NEW.pass_type = 'night_pass' THEN
    RAISE EXCEPTION 'Night Pass is no longer available';
  END IF;

  IF NEW.special_purpose = 'industrial_visit' THEN
    RAISE EXCEPTION 'Industrial Visit is no longer available under Special Pass';
  END IF;

  IF NEW.return_by <= NEW.departure_at THEN
    RAISE EXCEPTION 'Return must be after departure';
  END IF;

  -- Always set before NOT NULL check (covers clients that omit the column).
  NEW.allows_multi_daily_scan := COALESCE(
    NEW.special_purpose = 'internship',
    false
  );

  v_hours := EXTRACT(EPOCH FROM (NEW.return_by - NEW.departure_at)) / 3600.0;
  v_days := (
    (NEW.return_by AT TIME ZONE 'Asia/Kolkata')::date
    - (NEW.departure_at AT TIME ZONE 'Asia/Kolkata')::date
  );

  SELECT NULLIF(value, '')::NUMERIC INTO v_max_outpass_hours
  FROM public.system_settings WHERE key = 'max_outpass_hours';
  v_max_outpass_hours := COALESCE(v_max_outpass_hours, 24);

  SELECT NULLIF(value, '')::INTEGER INTO v_max_special_days
  FROM public.system_settings WHERE key = 'max_special_pass_days';
  v_max_special_days := COALESCE(v_max_special_days, 7);

  SELECT NULLIF(value, '')::INTEGER INTO v_max_internship_days
  FROM public.system_settings WHERE key = 'max_internship_days';
  v_max_internship_days := COALESCE(v_max_internship_days, 15);

  IF NEW.pass_type = 'outpass' AND v_hours > v_max_outpass_hours THEN
    RAISE EXCEPTION 'Outpass may be at most % hours', v_max_outpass_hours;
  END IF;

  IF NEW.pass_type = 'special_pass' THEN
    IF NEW.special_purpose IS NULL THEN
      RAISE EXCEPTION 'Special Pass requires a purpose';
    END IF;

    IF NEW.special_purpose = 'internship' THEN
      IF v_days > v_max_internship_days THEN
        RAISE EXCEPTION 'Internship pass may be at most % days', v_max_internship_days;
      END IF;
    ELSIF v_days > v_max_special_days THEN
      RAISE EXCEPTION 'Special Pass may be at most % days', v_max_special_days;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS outpass_pass_rules ON public.outpass_requests;
CREATE TRIGGER outpass_pass_rules
  BEFORE INSERT OR UPDATE OF pass_type, special_purpose, departure_at, return_by
  ON public.outpass_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_outpass_pass_rules();
