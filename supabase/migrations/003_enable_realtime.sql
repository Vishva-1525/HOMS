-- Enable Supabase Realtime for live dashboard updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.outpass_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_logs;
