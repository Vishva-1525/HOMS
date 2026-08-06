-- Auto-select and record the next of the four gate checkpoints for a pass.
-- Client no longer guesses the next step (avoids hostel_exit looping after scan 1).

CREATE OR REPLACE FUNCTION public.record_next_gate_scan(p_outpass_id UUID)
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
  v_step INT;
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
    v_step := 1;
  ELSIF NOT ('main_exit' = ANY (v_done)) THEN
    v_expected := 'main_exit';
    v_step := 2;
  ELSIF NOT ('main_entry' = ANY (v_done)) THEN
    v_expected := 'main_entry';
    v_step := 3;
  ELSIF NOT ('hostel_entry' = ANY (v_done)) THEN
    v_expected := 'hostel_entry';
    v_step := 4;
  ELSE
    RAISE EXCEPTION 'All four gate scans already recorded for today';
  END IF;

  IF v_expected IN ('hostel_exit', 'main_exit')
     AND NOT v_pass.allows_multi_daily_scan
     AND v_now > v_pass.return_by THEN
    RAISE EXCEPTION 'This pass has expired';
  END IF;

  v_event := CASE
    WHEN v_expected IN ('hostel_exit', 'main_exit') THEN 'exit'::public.gate_event_type
    ELSE 'entry'::public.gate_event_type
  END;

  INSERT INTO public.gate_logs (
    outpass_id, scanned_by, event_type, checkpoint, multi_daily_scan
  ) VALUES (
    p_outpass_id, auth.uid(), v_event, v_expected, v_pass.allows_multi_daily_scan
  );

  RETURN json_build_object(
    'ok', true,
    'checkpoint', v_expected,
    'event_type', v_event,
    'step', v_step,
    'total_steps', 4,
    'multi_daily_scan', v_pass.allows_multi_daily_scan,
    'cycle_complete', v_expected = 'hostel_entry',
    'completed', v_done || ARRAY[v_expected::text],
    'next_checkpoint', CASE
      WHEN v_expected = 'hostel_exit' THEN 'main_exit'
      WHEN v_expected = 'main_exit' THEN 'main_entry'
      WHEN v_expected = 'main_entry' THEN 'hostel_entry'
      ELSE NULL
    END
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This checkpoint was already scanned';
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_next_gate_scan(UUID) TO authenticated;

-- Keep insert policy aligned with extended passes (direct inserts / older clients).
DROP POLICY IF EXISTS "Security guards can insert gate logs" ON public.gate_logs;
CREATE POLICY "Security guards can insert gate logs"
  ON public.gate_logs FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'security_guard'
    AND scanned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.status IN ('approved', 'extended')
    )
  );
