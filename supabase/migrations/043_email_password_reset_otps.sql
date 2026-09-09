-- Email-based password reset OTPs (any auth user)

CREATE TABLE public.email_password_reset_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_password_reset_otps_user_id
  ON public.email_password_reset_otps (user_id);

CREATE INDEX idx_email_password_reset_otps_email
  ON public.email_password_reset_otps (lower(email));

ALTER TABLE public.email_password_reset_otps ENABLE ROW LEVEL SECURITY;
-- Only service role / edge functions access OTP rows (no client policies)
