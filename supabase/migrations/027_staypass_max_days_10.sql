-- Staypass return window: up to 10 days (weekends/holidays allowed in app validation)
UPDATE public.system_settings
SET value = '10'
WHERE key = 'max_staypass_days';
