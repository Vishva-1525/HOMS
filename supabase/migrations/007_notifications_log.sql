-- Warden notification log

CREATE TABLE public.notifications_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_log_user_id ON public.notifications_log (user_id);
CREATE INDEX idx_notifications_log_created_at ON public.notifications_log (created_at DESC);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_log_select_own
  ON public.notifications_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_log_update_own
  ON public.notifications_log FOR UPDATE
  USING (user_id = auth.uid());
