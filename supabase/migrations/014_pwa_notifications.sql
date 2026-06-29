-- PWA push subscriptions, notification triggers, and dispatch outbox
-- Prerequisites (migrations 007 + 012) — safe if already applied

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON public.notifications_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON public.notifications_log (created_at DESC);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_log_select_own ON public.notifications_log;
CREATE POLICY notifications_log_select_own
  ON public.notifications_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_log_update_own ON public.notifications_log;
CREATE POLICY notifications_log_update_own
  ON public.notifications_log FOR UPDATE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Push subscriptions (Web Push API)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- SMS audit log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sms_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'queued',
  provider   TEXT NOT NULL DEFAULT 'msg91',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_log_admin_read ON public.sms_log;
CREATE POLICY sms_log_admin_read
  ON public.sms_log FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Notification dispatch outbox (processed by Edge Function)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications_log (id) ON DELETE CASCADE,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON public.notification_outbox (created_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- System settings for server-side dispatch
-- ---------------------------------------------------------------------------

INSERT INTO public.system_settings (key, value)
VALUES
  ('supabase_functions_url', ''),
  ('notification_dispatch_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Realtime for notifications
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_log;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: find wardens for a hostel block
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_warden_ids_for_block(p_block TEXT)
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
    AND sa.assignment_value = p_block
    AND p.role = 'warden';
$$;

-- ---------------------------------------------------------------------------
-- Notify wardens when a student submits a new outpass request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_outpass_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block TEXT;
  v_student_name TEXT;
  v_warden_id UUID;
  v_pass_label TEXT;
BEGIN
  SELECT s.hostel_block, p.full_name
  INTO v_block, v_student_name
  FROM public.students s
  JOIN public.profiles p ON p.id = s.id
  WHERE s.id = NEW.student_id;

  v_pass_label := REPLACE(NEW.pass_type::text, '_', ' ');

  FOR v_warden_id IN SELECT public.get_warden_ids_for_block(v_block)
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

DROP TRIGGER IF EXISTS trg_outpass_created_notify ON public.outpass_requests;
CREATE TRIGGER trg_outpass_created_notify
  AFTER INSERT ON public.outpass_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_outpass_created();

-- ---------------------------------------------------------------------------
-- Notify student when outpass is approved or rejected
-- ---------------------------------------------------------------------------

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

  INSERT INTO public.notifications_log (user_id, type, message)
  VALUES (NEW.student_id, v_type, v_msg);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outpass_status_notify ON public.outpass_requests;
CREATE TRIGGER trg_outpass_status_notify
  AFTER UPDATE OF status ON public.outpass_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_outpass_status_changed();

-- ---------------------------------------------------------------------------
-- Notify wardens when a student requests an extension
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_extension_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block TEXT;
  v_student_name TEXT;
  v_destination TEXT;
  v_warden_id UUID;
BEGIN
  SELECT s.hostel_block, p.full_name, o.destination
  INTO v_block, v_student_name, v_destination
  FROM public.outpass_requests o
  JOIN public.students s ON s.id = o.student_id
  JOIN public.profiles p ON p.id = s.id
  WHERE o.id = NEW.outpass_id;

  FOR v_warden_id IN SELECT public.get_warden_ids_for_block(v_block)
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

DROP TRIGGER IF EXISTS trg_extension_created_notify ON public.extension_requests;
CREATE TRIGGER trg_extension_created_notify
  AFTER INSERT ON public.extension_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_extension_created();

-- ---------------------------------------------------------------------------
-- Notify student when extension is approved or rejected
-- ---------------------------------------------------------------------------

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

  INSERT INTO public.notifications_log (user_id, type, message)
  VALUES (v_student_id, v_type, v_msg);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extension_status_notify ON public.extension_requests;
CREATE TRIGGER trg_extension_status_notify
  AFTER UPDATE OF status ON public.extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_extension_status_changed();

-- ---------------------------------------------------------------------------
-- Enqueue push/SMS dispatch when a notification is created
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_notification_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (notification_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_dispatch_enqueue ON public.notifications_log;
CREATE TRIGGER trg_notification_dispatch_enqueue
  AFTER INSERT ON public.notifications_log
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_notification_dispatch();

-- Optional pg_net dispatch when functions URL is configured in system_settings
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.try_dispatch_notification_async(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT value INTO v_base_url FROM public.system_settings WHERE key = 'supabase_functions_url';
  SELECT value INTO v_secret FROM public.system_settings WHERE key = 'notification_dispatch_secret';

  IF v_base_url IS NULL OR btrim(v_base_url) = '' OR v_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM extensions.http_post(
    url := rtrim(v_base_url, '/') || '/notification-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'notification_id', p_notification_id,
      'secret', v_secret
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_outbox_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.try_dispatch_notification_async(NEW.notification_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outbox_dispatch ON public.notification_outbox;
CREATE TRIGGER trg_outbox_dispatch
  AFTER INSERT ON public.notification_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_outbox_notification();

NOTIFY pgrst, 'reload schema';
