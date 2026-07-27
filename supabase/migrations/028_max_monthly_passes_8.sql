-- Raise monthly pass quota to 8 per student (weekly stays at 2)

UPDATE public.system_settings
SET value = '8'
WHERE key = 'max_monthly_passes';

INSERT INTO public.system_settings (key, value) VALUES
  ('max_monthly_passes', '8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
