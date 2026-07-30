-- Four-checkpoint gate scan workflow:
-- 1) hostel_exit → 2) main_exit → 3) main_entry → 4) hostel_entry

DO $$ BEGIN
  CREATE TYPE public.gate_checkpoint AS ENUM (
    'hostel_exit',
    'main_exit',
    'main_entry',
    'hostel_entry'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.gate_logs
  ADD COLUMN IF NOT EXISTS checkpoint public.gate_checkpoint;

-- Backfill legacy 2-scan rows so trip-complete / currently-out semantics stay valid.
UPDATE public.gate_logs
SET checkpoint = CASE event_type
  WHEN 'exit' THEN 'hostel_exit'::public.gate_checkpoint
  WHEN 'entry' THEN 'hostel_entry'::public.gate_checkpoint
END
WHERE checkpoint IS NULL;

ALTER TABLE public.gate_logs
  ALTER COLUMN checkpoint SET NOT NULL;

-- Drop old event_type uniqueness (replaced by checkpoint uniqueness).
DROP INDEX IF EXISTS public.idx_gate_logs_single_exit_per_pass;
DROP INDEX IF EXISTS public.idx_gate_logs_single_entry_per_pass;
DROP INDEX IF EXISTS public.idx_gate_logs_multi_exit_per_day;
DROP INDEX IF EXISTS public.idx_gate_logs_multi_entry_per_day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_single_checkpoint_per_pass
  ON public.gate_logs (outpass_id, checkpoint)
  WHERE multi_daily_scan = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_logs_multi_checkpoint_per_day
  ON public.gate_logs (
    outpass_id,
    checkpoint,
    ((scanned_at AT TIME ZONE 'Asia/Kolkata')::date)
  )
  WHERE multi_daily_scan = true;

CREATE OR REPLACE FUNCTION public.record_gate_scan(
  p_outpass_id UUID,
  p_checkpoint public.gate_checkpoint
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_pass public.outpass_requests%ROWTYPE;
  v_expected public.gate_checkpoint;
  v_event public.gate_event_type;
  v_now TIMESTAMPTZ := now();
  v_day DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_done TEXT[];
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

  IF v_pass.allows_multi_daily_scan THEN
    IF v_now < v_pass.departure_at THEN
      RAISE EXCEPTION 'Internship QR is not valid before departure';
    END IF;
    IF v_now > v_pass.return_by THEN
      RAISE EXCEPTION 'Internship QR has expired. Student must renew the pass.';
    END IF;
  ELSIF p_checkpoint IN ('hostel_exit', 'main_exit') AND v_now > v_pass.return_by THEN
    RAISE EXCEPTION 'This pass has expired';
  END IF;

  IF v_pass.allows_multi_daily_scan THEN
    SELECT COALESCE(array_agg(gl.checkpoint::text ORDER BY
      CASE gl.checkpoint
        WHEN 'hostel_exit' THEN 1
        WHEN 'main_exit' THEN 2
        WHEN 'main_entry' THEN 3
        WHEN 'hostel_entry' THEN 4
      END), ARRAY[]::text[])
    INTO v_done
    FROM public.gate_logs gl
    WHERE gl.outpass_id = p_outpass_id
      AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_day;
  ELSE
    SELECT COALESCE(array_agg(gl.checkpoint::text ORDER BY
      CASE gl.checkpoint
        WHEN 'hostel_exit' THEN 1
        WHEN 'main_exit' THEN 2
        WHEN 'main_entry' THEN 3
        WHEN 'hostel_entry' THEN 4
      END), ARRAY[]::text[])
    INTO v_done
    FROM public.gate_logs gl
    WHERE gl.outpass_id = p_outpass_id;
  END IF;

  IF 'hostel_entry' = ANY (v_done) AND NOT v_pass.allows_multi_daily_scan THEN
    RAISE EXCEPTION 'Pass trip already completed';
  END IF;

  IF NOT ('hostel_exit' = ANY (v_done)) THEN
    v_expected := 'hostel_exit';
  ELSIF NOT ('main_exit' = ANY (v_done)) THEN
    v_expected := 'main_exit';
  ELSIF NOT ('main_entry' = ANY (v_done)) THEN
    v_expected := 'main_entry';
  ELSIF NOT ('hostel_entry' = ANY (v_done)) THEN
    v_expected := 'hostel_entry';
  ELSE
    -- Multi-daily: today's cycle complete
    RAISE EXCEPTION 'All four gate scans already recorded for today';
  END IF;

  IF p_checkpoint IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Out of sequence. Next required scan: %',
      CASE v_expected
        WHEN 'hostel_exit' THEN 'Hostel Gate Exit'
        WHEN 'main_exit' THEN 'Main Gate Exit'
        WHEN 'main_entry' THEN 'Main Gate Entry'
        WHEN 'hostel_entry' THEN 'Hostel Gate Entry'
      END;
  END IF;

  IF p_checkpoint::text = ANY (v_done) THEN
    RAISE EXCEPTION 'This checkpoint was already scanned';
  END IF;

  v_event := CASE
    WHEN p_checkpoint IN ('hostel_exit', 'main_exit') THEN 'exit'::public.gate_event_type
    ELSE 'entry'::public.gate_event_type
  END;

  INSERT INTO public.gate_logs (
    outpass_id, scanned_by, event_type, checkpoint, multi_daily_scan
  ) VALUES (
    p_outpass_id, auth.uid(), v_event, p_checkpoint, v_pass.allows_multi_daily_scan
  );

  RETURN json_build_object(
    'ok', true,
    'checkpoint', p_checkpoint,
    'event_type', v_event,
    'multi_daily_scan', v_pass.allows_multi_daily_scan,
    'cycle_complete', p_checkpoint = 'hostel_entry'
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This checkpoint was already scanned';
END;
$$;

-- Drop old 2-arg signature if present, keep only checkpoint version.
DROP FUNCTION IF EXISTS public.record_gate_scan(UUID, public.gate_event_type);

GRANT EXECUTE ON FUNCTION public.record_gate_scan(UUID, public.gate_checkpoint) TO authenticated;

-- Overdue: trip started (hostel exit) and not finished (hostel entry).
CREATE OR REPLACE FUNCTION public.refresh_outpass_overdue_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outpass_requests o
  SET is_overdue = CASE
    WHEN o.status NOT IN ('approved', 'extended') THEN false
    WHEN o.allows_multi_daily_scan THEN
      EXISTS (
        SELECT 1
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND gl.checkpoint = 'hostel_exit'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND gl.checkpoint = 'hostel_entry'
      )
      AND now() > o.return_by
    ELSE
      EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_exit'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_entry'
      )
      AND now() > o.return_by
  END
  WHERE o.status IN ('approved', 'extended', 'cancelled');
END;
$$;

-- Preserve existing view column order (CREATE OR REPLACE cannot rename columns).
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
            EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id
                AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
                  = (now() AT TIME ZONE 'Asia/Kolkata')::date
                AND gl.checkpoint = 'hostel_exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id
                AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
                  = (now() AT TIME ZONE 'Asia/Kolkata')::date
                AND gl.checkpoint = 'hostel_entry'
            )
          ELSE
            EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_entry'
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
            AND EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id
                AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
                  = (now() AT TIME ZONE 'Asia/Kolkata')::date
                AND gl.checkpoint = 'hostel_exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id
                AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
                  = (now() AT TIME ZONE 'Asia/Kolkata')::date
                AND gl.checkpoint = 'hostel_entry'
            )
          ELSE
            EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_exit'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.gate_logs gl
              WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_entry'
            )
        END
    ) THEN 'outside'
    ELSE 'inside'
  END AS current_status
FROM public.students s
JOIN public.profiles p ON p.id = s.id;

GRANT SELECT ON public.student_campus_status TO authenticated;
