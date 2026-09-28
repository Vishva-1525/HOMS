-- Server-authoritative pass QR visibility (device clock is never trusted).

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pass_view(p_outpass_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.outpass_requests%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_day DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_window INT;
  v_opens TIMESTAMPTZ;
  v_next_day TIMESTAMPTZ;
  v_exited BOOLEAN;
  v_returned BOOLEAN;
BEGIN
  SELECT * INTO v_pass
  FROM public.outpass_requests
  WHERE id = p_outpass_id
    AND student_id = public.current_student_id();

  IF NOT FOUND OR v_pass.status NOT IN ('approved', 'extended') THEN
    RETURN json_build_object('now', v_now, 'state', 'closed');
  END IF;

  IF v_pass.allows_multi_daily_scan THEN
    IF v_now > v_pass.return_by THEN
      RETURN json_build_object('now', v_now, 'state', 'closed');
    END IF;

    IF v_now < v_pass.departure_at THEN
      RETURN json_build_object('now', v_now, 'state', 'waiting', 'opens_at', v_pass.departure_at);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.gate_logs gl
      WHERE gl.outpass_id = v_pass.id
        AND gl.checkpoint = 'hostel_entry'
        AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_day
    ) THEN
      v_next_day := ((v_day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');
      IF v_next_day > v_pass.return_by THEN
        RETURN json_build_object('now', v_now, 'state', 'closed');
      END IF;
      RETURN json_build_object('now', v_now, 'state', 'waiting', 'opens_at', v_next_day);
    END IF;

    RETURN json_build_object('now', v_now, 'state', 'ready');
  END IF;

  SELECT
    bool_or(gl.checkpoint = 'hostel_exit'),
    bool_or(gl.checkpoint = 'hostel_entry')
  INTO v_exited, v_returned
  FROM public.gate_logs gl
  WHERE gl.outpass_id = v_pass.id;

  IF COALESCE(v_returned, false) THEN
    RETURN json_build_object('now', v_now, 'state', 'closed');
  END IF;

  IF COALESCE(v_exited, false) THEN
    RETURN json_build_object('now', v_now, 'state', 'ready');
  END IF;

  IF v_now > v_pass.return_by THEN
    RETURN json_build_object('now', v_now, 'state', 'closed');
  END IF;

  SELECT COALESCE(NULLIF(value, '')::INT, 30) INTO v_window
  FROM public.system_settings
  WHERE key = 'qr_availability_minutes';

  v_opens := v_pass.departure_at - make_interval(mins => GREATEST(COALESCE(v_window, 30), 0));

  IF v_now < v_opens THEN
    RETURN json_build_object('now', v_now, 'state', 'waiting', 'opens_at', v_opens);
  END IF;

  RETURN json_build_object('now', v_now, 'state', 'ready');
END;
$$;

REVOKE ALL ON FUNCTION public.get_pass_view(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pass_view(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
