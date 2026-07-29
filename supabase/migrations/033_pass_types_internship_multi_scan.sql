-- Pass type cleanup, duration rules, and internship 15-day multi-use QR scans.
-- Night pass / industrial visit remain in enums for historical rows but are blocked on write.

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

UPDATE public.system_settings
SET value = '24'
WHERE key = 'max_outpass_hours';

-- 0 = unlimited (stay pass has no max duration)
UPDATE public.system_settings
SET value = '0'
WHERE key = 'max_staypass_days';

INSERT INTO public.system_settings (key, value) VALUES
  ('max_special_pass_days', '7'),
  ('max_internship_days', '15')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DELETE FROM public.system_settings WHERE key = 'max_night_pass_hours';

-- ---------------------------------------------------------------------------
-- Multi-daily scan flag (internship QR reusable for exit+entry across days)
-- ---------------------------------------------------------------------------

ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS allows_multi_daily_scan BOOLEAN NOT NULL DEFAULT false;

UPDATE public.outpass_requests
SET allows_multi_daily_scan = true
WHERE special_purpose = 'internship'
  AND allows_multi_daily_scan = false;

CREATE OR REPLACE FUNCTION public.trg_outpass_pass_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

  NEW.allows_multi_daily_scan := (NEW.special_purpose = 'internship');

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

  -- staypass: unlimited duration (no max check)

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

-- ---------------------------------------------------------------------------
-- Gate logs: single-use vs multi-daily uniqueness
-- ---------------------------------------------------------------------------

ALTER TABLE public.gate_logs
  ADD COLUMN IF NOT EXISTS multi_daily_scan BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS public.idx_gate_logs_one_exit_per_pass;
DROP INDEX IF EXISTS public.idx_gate_logs_one_entry_per_pass;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_single_exit_per_pass
  ON public.gate_logs (outpass_id)
  WHERE event_type = 'exit' AND multi_daily_scan = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_single_entry_per_pass
  ON public.gate_logs (outpass_id)
  WHERE event_type = 'entry' AND multi_daily_scan = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_multi_exit_per_day
  ON public.gate_logs (
    outpass_id,
    ((scanned_at AT TIME ZONE 'Asia/Kolkata')::date)
  )
  WHERE event_type = 'exit' AND multi_daily_scan = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_multi_entry_per_day
  ON public.gate_logs (
    outpass_id,
    ((scanned_at AT TIME ZONE 'Asia/Kolkata')::date)
  )
  WHERE event_type = 'entry' AND multi_daily_scan = true;

CREATE OR REPLACE FUNCTION public.trg_gate_logs_set_multi_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(allows_multi_daily_scan, false)
  INTO NEW.multi_daily_scan
  FROM public.outpass_requests
  WHERE id = NEW.outpass_id;

  NEW.multi_daily_scan := COALESCE(NEW.multi_daily_scan, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gate_logs_set_multi_scan ON public.gate_logs;
CREATE TRIGGER gate_logs_set_multi_scan
  BEFORE INSERT ON public.gate_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_gate_logs_set_multi_scan();

-- ---------------------------------------------------------------------------
-- Backend gate scan RPC (expiry + next action + insert)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_gate_scan(
  p_outpass_id UUID,
  p_event_type public.gate_event_type
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_pass public.outpass_requests%ROWTYPE;
  v_latest public.gate_event_type;
  v_expected public.gate_event_type;
  v_today_exit BOOLEAN;
  v_today_entry BOOLEAN;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('security_guard', 'admin', 'warden') THEN
    RAISE EXCEPTION 'Not authorized to record gate scans';
  END IF;

  SELECT * INTO v_pass
  FROM public.outpass_requests
  WHERE id = p_outpass_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass not found';
  END IF;

  IF v_pass.status NOT IN ('approved', 'extended') THEN
    RAISE EXCEPTION 'This pass is not active';
  END IF;

  -- Internship / multi-daily: hard validity window (QR invalid outside it)
  IF v_pass.allows_multi_daily_scan THEN
    IF v_now < v_pass.departure_at THEN
      RAISE EXCEPTION 'Internship QR is not valid before departure';
    END IF;
    IF v_now > v_pass.return_by THEN
      RAISE EXCEPTION 'Internship QR has expired. Student must renew the pass.';
    END IF;
  ELSIF p_event_type = 'exit' AND v_now > v_pass.return_by THEN
    RAISE EXCEPTION 'This pass has expired';
  END IF;

  SELECT gl.event_type INTO v_latest
  FROM public.gate_logs gl
  WHERE gl.outpass_id = p_outpass_id
  ORDER BY gl.scanned_at DESC
  LIMIT 1;

  IF v_pass.allows_multi_daily_scan THEN
    SELECT
      EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = p_outpass_id
          AND gl.event_type = 'exit'
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (v_now AT TIME ZONE 'Asia/Kolkata')::date
      ),
      EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = p_outpass_id
          AND gl.event_type = 'entry'
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (v_now AT TIME ZONE 'Asia/Kolkata')::date
      )
    INTO v_today_exit, v_today_entry;

    IF v_latest IS NULL OR v_latest = 'entry' THEN
      v_expected := 'exit';
    ELSE
      v_expected := 'entry';
    END IF;

    IF p_event_type = 'exit' AND v_today_exit THEN
      RAISE EXCEPTION 'Exit already recorded for today';
    END IF;
    IF p_event_type = 'entry' AND v_today_entry THEN
      RAISE EXCEPTION 'Entry already recorded for today';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.gate_logs
      WHERE outpass_id = p_outpass_id AND event_type = 'entry'
    ) THEN
      RAISE EXCEPTION 'Student already entered';
    END IF;

    IF v_latest IS NULL THEN
      v_expected := 'exit';
    ELSE
      v_expected := 'entry';
    END IF;

    IF p_event_type = 'exit' AND v_latest = 'exit' THEN
      RAISE EXCEPTION 'Student already exited';
    END IF;
    IF p_event_type = 'entry' AND v_latest IS DISTINCT FROM 'exit' THEN
      RAISE EXCEPTION 'Record exit before allowing entry';
    END IF;
  END IF;

  IF p_event_type IS DISTINCT FROM v_expected THEN
    IF v_expected = 'exit' THEN
      RAISE EXCEPTION 'This student must exit first';
    ELSE
      RAISE EXCEPTION 'Student already exited — record entry on return';
    END IF;
  END IF;

  INSERT INTO public.gate_logs (outpass_id, scanned_by, event_type, multi_daily_scan)
  VALUES (p_outpass_id, auth.uid(), p_event_type, v_pass.allows_multi_daily_scan);

  RETURN json_build_object(
    'ok', true,
    'event_type', p_event_type,
    'multi_daily_scan', v_pass.allows_multi_daily_scan
  );
EXCEPTION
  WHEN unique_violation THEN
    IF p_event_type = 'exit' THEN
      RAISE EXCEPTION 'Student already exited';
    ELSE
      RAISE EXCEPTION 'Student already entered';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_gate_scan(UUID, public.gate_event_type) TO authenticated;

-- ---------------------------------------------------------------------------
-- Entry-code lookup: reject expired internship / multi-daily QRs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_outpass_id_by_entry_code(p_entry_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_multi BOOLEAN;
  v_return_by TIMESTAMPTZ;
  v_departure TIMESTAMPTZ;
BEGIN
  SELECT id, allows_multi_daily_scan, return_by, departure_at
  INTO v_id, v_multi, v_return_by, v_departure
  FROM public.outpass_requests
  WHERE upper(trim(entry_code)) = upper(trim(p_entry_code))
    AND status IN ('approved', 'extended')
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_multi AND (now() < v_departure OR now() > v_return_by) THEN
    RETURN NULL;
  END IF;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Overdue flags: multi-daily = still outside (latest event exit) past return_by
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_outpass_overdue_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outpass_requests o
  SET is_overdue = false
  WHERE o.status NOT IN ('approved', 'extended');

  UPDATE public.outpass_requests o
  SET is_overdue = (
    o.return_by < now()
    AND CASE
      WHEN o.allows_multi_daily_scan THEN
        COALESCE(
          (
            SELECT gl.event_type
            FROM public.gate_logs gl
            WHERE gl.outpass_id = o.id
            ORDER BY gl.scanned_at DESC
            LIMIT 1
          ),
          'entry'
        ) = 'exit'
      ELSE
        NOT EXISTS (
          SELECT 1 FROM public.gate_logs gl
          WHERE gl.outpass_id = o.id AND gl.event_type = 'entry'
        )
    END
  )
  WHERE o.status IN ('approved', 'extended');
END;
$$;

-- ---------------------------------------------------------------------------
-- Campus status: latest-event based for multi-daily scans
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.student_campus_status
WITH (security_invoker = true)
AS
SELECT
  s.id AS student_id,
  s.reg_number,
  COALESCE(p.full_name, '') AS full_name,
  s.hostel_block,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.outpass_requests o
      WHERE o.student_id = s.id
        AND o.status IN ('approved', 'extended')
        AND o.return_by < now()
        AND CASE
          WHEN o.allows_multi_daily_scan THEN
            COALESCE(
              (
                SELECT gl.event_type FROM public.gate_logs gl
                WHERE gl.outpass_id = o.id
                ORDER BY gl.scanned_at DESC LIMIT 1
              ),
              'entry'
            ) = 'exit'
          ELSE
            EXISTS (
              SELECT 1 FROM public.gate_logs gl_exit
              WHERE gl_exit.outpass_id = o.id AND gl_exit.event_type = 'exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl_entry
              WHERE gl_entry.outpass_id = o.id AND gl_entry.event_type = 'entry'
            )
        END
    ) THEN 'overdue'
    WHEN EXISTS (
      SELECT 1
      FROM public.outpass_requests o
      WHERE o.student_id = s.id
        AND o.status IN ('approved', 'extended')
        AND CASE
          WHEN o.allows_multi_daily_scan THEN
            o.return_by >= now()
            AND COALESCE(
              (
                SELECT gl.event_type FROM public.gate_logs gl
                WHERE gl.outpass_id = o.id
                ORDER BY gl.scanned_at DESC LIMIT 1
              ),
              'entry'
            ) = 'exit'
          ELSE
            EXISTS (
              SELECT 1 FROM public.gate_logs gl_exit
              WHERE gl_exit.outpass_id = o.id AND gl_exit.event_type = 'exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl_entry
              WHERE gl_entry.outpass_id = o.id AND gl_entry.event_type = 'entry'
            )
        END
    ) THEN 'outside'
    ELSE 'inside'
  END AS current_status
FROM public.students s
JOIN public.profiles p ON p.id = s.id;

GRANT SELECT ON public.student_campus_status TO authenticated;

-- ---------------------------------------------------------------------------
-- Student-readable limits
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
    'max_special_pass_days',
    'max_internship_days',
    'qr_availability_minutes'
  );
$$;

SELECT public.refresh_outpass_overdue_flags();

NOTIFY pgrst, 'reload schema';
