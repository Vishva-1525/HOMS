-- Reliable background Web Push dispatch.
-- Fixes silent pg_net failures (Supabase Functions require Authorization + apikey)
-- and adds a pending-outbox flusher so pushes go out even if no client is online.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

INSERT INTO public.system_settings (key, value)
VALUES
  ('supabase_functions_url', ''),
  ('supabase_anon_key', ''),
  ('notification_dispatch_secret', coalesce(
    (SELECT value FROM public.system_settings WHERE key = 'notification_dispatch_secret'),
    gen_random_uuid()::text
  ))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.try_dispatch_notification_async(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_anon TEXT;
  v_headers JSONB;
  v_body JSONB;
BEGIN
  SELECT value INTO v_base_url FROM public.system_settings WHERE key = 'supabase_functions_url';
  SELECT value INTO v_secret FROM public.system_settings WHERE key = 'notification_dispatch_secret';
  SELECT value INTO v_anon FROM public.system_settings WHERE key = 'supabase_anon_key';

  IF v_base_url IS NULL OR btrim(v_base_url) = '' THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');

  -- Supabase API gateway requires these even when the function has verify_jwt = false.
  IF v_anon IS NOT NULL AND btrim(v_anon) <> '' THEN
    v_headers := v_headers || jsonb_build_object(
      'Authorization', 'Bearer ' || btrim(v_anon),
      'apikey', btrim(v_anon)
    );
  END IF;

  v_body := jsonb_build_object(
    'notification_id', p_notification_id,
    'secret', coalesce(v_secret, '')
  );

  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/notification-dispatch',
      headers := v_headers,
      body := v_body
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      PERFORM extensions.http_post(
        url := rtrim(v_base_url, '/') || '/notification-dispatch',
        headers := v_headers,
        body := v_body
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END;
$$;

-- Flush all pending outbox rows (used by cron / recovery).
CREATE OR REPLACE FUNCTION public.flush_pending_notification_dispatches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_anon TEXT;
  v_headers JSONB;
  v_count INTEGER;
BEGIN
  SELECT count(*)::integer INTO v_count
  FROM public.notification_outbox
  WHERE processed_at IS NULL;

  IF v_count = 0 THEN
    RETURN 0;
  END IF;

  SELECT value INTO v_base_url FROM public.system_settings WHERE key = 'supabase_functions_url';
  SELECT value INTO v_secret FROM public.system_settings WHERE key = 'notification_dispatch_secret';
  SELECT value INTO v_anon FROM public.system_settings WHERE key = 'supabase_anon_key';

  IF v_base_url IS NULL OR btrim(v_base_url) = '' THEN
    RETURN v_count;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_anon IS NOT NULL AND btrim(v_anon) <> '' THEN
    v_headers := v_headers || jsonb_build_object(
      'Authorization', 'Bearer ' || btrim(v_anon),
      'apikey', btrim(v_anon)
    );
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/notification-dispatch',
      headers := v_headers,
      body := jsonb_build_object(
        'flush', true,
        'secret', coalesce(v_secret, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      PERFORM extensions.http_post(
        url := rtrim(v_base_url, '/') || '/notification-dispatch',
        headers := v_headers,
        body := jsonb_build_object(
          'flush', true,
          'secret', coalesce(v_secret, '')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.flush_pending_notification_dispatches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flush_pending_notification_dispatches() TO service_role;

-- Retry stuck outbox every minute when pg_cron is available.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — skipping scheduled push flush';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('homs-flush-notification-outbox');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'homs-flush-notification-outbox',
      '* * * * *',
      $cron$SELECT public.flush_pending_notification_dispatches();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule homs-flush-notification-outbox';
END $$;

NOTIFY pgrst, 'reload schema';
