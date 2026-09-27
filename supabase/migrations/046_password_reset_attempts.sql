-- Failed-attempt counter for email password reset codes.

ALTER TABLE public.email_password_reset_otps
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_email_password_reset_otps_user_created
  ON public.email_password_reset_otps (user_id, created_at DESC);
