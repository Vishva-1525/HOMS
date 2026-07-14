-- Performance indexes for concurrent warden/admin/security list queries

CREATE INDEX IF NOT EXISTS idx_outpass_requests_status_created
  ON public.outpass_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outpass_requests_status_overdue
  ON public.outpass_requests (status, is_overdue)
  WHERE status IN ('approved', 'extended');

CREATE INDEX IF NOT EXISTS idx_outpass_requests_student_created
  ON public.outpass_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gate_logs_outpass_scanned
  ON public.gate_logs (outpass_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_extension_requests_status_created
  ON public.extension_requests (status, created_at DESC);
