-- Gender-aware student / warden routing (block + gender)

DO $$ BEGIN
  CREATE TYPE public.hostel_gender AS ENUM ('male', 'female');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender public.hostel_gender;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.hostel_gender;

-- Existing rows default to male until bulk import updates them.
UPDATE public.students SET gender = 'male' WHERE gender IS NULL;
UPDATE public.profiles SET gender = NULL WHERE role NOT IN ('warden', 'student');

ALTER TABLE public.students
  ALTER COLUMN gender SET DEFAULT 'male',
  ALTER COLUMN gender SET NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_hostel_block(p_block TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
  v_upper TEXT;
  v_token TEXT;
  v_num INT;
BEGIN
  v := btrim(COALESCE(p_block, ''));
  IF v = '' THEN
    RETURN '';
  END IF;

  v_upper := upper(v);

  IF v_upper ~ '^BLOCK\s+[IVX]+$' THEN
    v_token := regexp_replace(v_upper, '^BLOCK\s+', '');
  ELSIF v_upper ~ '^BLOCK\s+[0-9]+$' THEN
    RETURN 'BLOCK ' || ltrim(regexp_replace(v_upper, '^BLOCK\s+', ''), '0');
  ELSIF v_upper ~ '^[IVX]+$' THEN
    v_token := v_upper;
  ELSIF v_upper ~ '^[0-9]+$' THEN
    RETURN 'BLOCK ' || v_upper;
  ELSE
    RETURN v_upper;
  END IF;

  v_num := CASE v_token
    WHEN 'I' THEN 1
    WHEN 'II' THEN 2
    WHEN 'III' THEN 3
    WHEN 'IV' THEN 4
    WHEN 'V' THEN 5
    WHEN 'VI' THEN 6
    WHEN 'VII' THEN 7
    WHEN 'VIII' THEN 8
    WHEN 'IX' THEN 9
    ELSE NULL
  END;

  IF v_num IS NULL THEN
    RETURN v_upper;
  END IF;

  RETURN 'BLOCK ' || v_num::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_hostel_gender(p_gender TEXT)
RETURNS public.hostel_gender
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := lower(btrim(COALESCE(p_gender, '')));
BEGIN
  IF v IN ('male', 'm', 'boy', 'boys') THEN
    RETURN 'male'::public.hostel_gender;
  END IF;
  IF v IN ('female', 'f', 'girl', 'girls') THEN
    RETURN 'female'::public.hostel_gender;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_warden_ids_for_block(p_block TEXT, p_gender public.hostel_gender)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.profile_id
  FROM public.staff_assignments sa
  JOIN public.profiles p ON p.id = sa.profile_id
  WHERE sa.assignment_type = 'block'
    AND public.normalize_hostel_block(sa.assignment_value) = public.normalize_hostel_block(p_block)
    AND p.role = 'warden'
    AND p.gender = p_gender;
$$;

CREATE OR REPLACE FUNCTION public.notify_outpass_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block TEXT;
  v_gender public.hostel_gender;
  v_student_name TEXT;
  v_warden_id UUID;
  v_pass_label TEXT;
BEGIN
  SELECT s.hostel_block, s.gender, p.full_name
  INTO v_block, v_gender, v_student_name
  FROM public.students s
  JOIN public.profiles p ON p.id = s.id
  WHERE s.id = NEW.student_id;

  v_pass_label := REPLACE(NEW.pass_type::text, '_', ' ');

  FOR v_warden_id IN SELECT public.get_warden_ids_for_block(v_block, v_gender)
  LOOP
    INSERT INTO public.notifications_log (user_id, type, message)
    VALUES (
      v_warden_id,
      'pending',
      v_student_name || ' submitted a ' || v_pass_label || ' request to ' || NEW.destination
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_extension_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block TEXT;
  v_gender public.hostel_gender;
  v_student_name TEXT;
  v_destination TEXT;
  v_warden_id UUID;
BEGIN
  SELECT s.hostel_block, s.gender, p.full_name, o.destination
  INTO v_block, v_gender, v_student_name, v_destination
  FROM public.outpass_requests o
  JOIN public.students s ON s.id = o.student_id
  JOIN public.profiles p ON p.id = s.id
  WHERE o.id = NEW.outpass_id;

  FOR v_warden_id IN SELECT public.get_warden_ids_for_block(v_block, v_gender)
  LOOP
    INSERT INTO public.notifications_log (user_id, type, message)
    VALUES (
      v_warden_id,
      'extension',
      v_student_name || ' requested an extension for outpass to ' || v_destination
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Warden reports: optional gender filter (block + gender scope)
CREATE OR REPLACE FUNCTION public.get_outpass_report(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_hostel_block TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10000,
  p_gender TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('warden', 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.departure_at DESC), '[]'::json)
    FROM (
      SELECT
        s.reg_number,
        p.full_name AS student_name,
        s.room_number,
        s.hostel_block,
        s.department,
        s.year_of_study,
        o.pass_type::text AS pass_type,
        o.destination,
        o.reason,
        o.departure_at,
        o.return_by,
        o.status::text AS status,
        o.warden_remark,
        o.created_at AS submitted_at,
        exit_log.scanned_at AS actual_exit_time,
        entry_log.scanned_at AS actual_entry_time,
        CASE
          WHEN exit_log.scanned_at IS NOT NULL AND entry_log.scanned_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (entry_log.scanned_at - exit_log.scanned_at)) / 3600.0
          ELSE NULL
        END AS hours_outside,
        (
          o.status IN ('approved', 'extended')
          AND o.return_by < now()
          AND entry_log.scanned_at IS NULL
        ) AS is_overdue,
        approver.full_name AS approved_by_name,
        o.id AS outpass_id
      FROM public.outpass_requests o
      JOIN public.students s ON s.id = o.student_id
      JOIN public.profiles p ON p.id = s.id
      LEFT JOIN LATERAL (
        SELECT gl.scanned_at
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.event_type = 'exit'
        ORDER BY gl.scanned_at ASC
        LIMIT 1
      ) exit_log ON true
      LEFT JOIN LATERAL (
        SELECT gl.scanned_at
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.event_type = 'entry'
        ORDER BY gl.scanned_at DESC
        LIMIT 1
      ) entry_log ON true
      LEFT JOIN public.profiles approver ON approver.id = o.approved_by
      WHERE o.departure_at >= p_start
        AND o.departure_at <= p_end
        AND (
          p_hostel_block IS NULL
          OR p_hostel_block = ''
          OR public.normalize_hostel_block(s.hostel_block) = public.normalize_hostel_block(p_hostel_block)
        )
        AND (p_department IS NULL OR p_department = '' OR s.department = p_department)
        AND (p_gender IS NULL OR p_gender = '' OR s.gender::text = p_gender)
      ORDER BY o.departure_at DESC
      LIMIT p_limit
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_outpass_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
