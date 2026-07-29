-- Notification deep links and push subscription reliability.

ALTER TABLE public.notifications_log
  ADD COLUMN IF NOT EXISTS outpass_id UUID REFERENCES public.outpass_requests (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extension_id UUID REFERENCES public.extension_requests (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_log_outpass_id
  ON public.notifications_log (outpass_id)
  WHERE outpass_id IS NOT NULL;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Student notified on approve/reject with pass deep link
CREATE OR REPLACE FUNCTION public.notify_outpass_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
  v_type TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_type := 'approved';
    v_msg := 'Your outpass to ' || NEW.destination || ' has been approved. Your QR pass is ready.';
  ELSIF NEW.status = 'rejected' THEN
    v_type := 'rejected';
    v_msg := 'Your outpass to ' || NEW.destination || ' was rejected.';
    IF NEW.warden_remark IS NOT NULL AND btrim(NEW.warden_remark) <> '' THEN
      v_msg := v_msg || ' Remark: ' || NEW.warden_remark;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications_log (user_id, type, message, outpass_id)
  VALUES (NEW.student_id, v_type, v_msg, NEW.id);

  RETURN NEW;
END;
$$;

-- Warden notified on new request (gender-routed version from 025)
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
    INSERT INTO public.notifications_log (user_id, type, message, outpass_id)
    VALUES (
      v_warden_id,
      'pending',
      v_student_name || ' submitted a ' || v_pass_label || ' request to ' || NEW.destination,
      NEW.id
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
    INSERT INTO public.notifications_log (user_id, type, message, outpass_id, extension_id)
    VALUES (
      v_warden_id,
      'extension',
      v_student_name || ' requested an extension for outpass to ' || v_destination,
      NEW.outpass_id,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_extension_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_destination TEXT;
  v_msg TEXT;
  v_type TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT o.student_id, o.destination
  INTO v_student_id, v_destination
  FROM public.outpass_requests o
  WHERE o.id = NEW.outpass_id;

  IF NEW.status = 'approved' THEN
    v_type := 'approved';
    v_msg := 'Your extension for outpass to ' || v_destination || ' was approved.';
  ELSIF NEW.status = 'rejected' THEN
    v_type := 'rejected';
    v_msg := 'Your extension for outpass to ' || v_destination || ' was rejected.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications_log (user_id, type, message, outpass_id, extension_id)
  VALUES (v_student_id, v_type, v_msg, NEW.outpass_id, NEW.id);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
