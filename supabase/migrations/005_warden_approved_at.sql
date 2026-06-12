-- Track when a pass was approved (for "Approved today" warden stat)

ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

UPDATE public.outpass_requests
SET approved_at = created_at
WHERE status IN ('approved', 'extended')
  AND approved_at IS NULL;
