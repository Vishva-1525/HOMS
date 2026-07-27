-- Push subscription upserts need UPDATE; fix async dispatch via pg_net;
-- clear student phones that were copied from parent_phone.

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

UPDATE public.profiles AS p
SET phone = ''
FROM public.students AS s
WHERE s.id = p.id
  AND p.role = 'student'
  AND COALESCE(p.phone, '') <> ''
  AND COALESCE(s.parent_phone, '') <> ''
  AND regexp_replace(p.phone, '\s+', '', 'g')
    = regexp_replace(s.parent_phone, '\s+', '', 'g');

-- Server-side push dispatch. Configure:
--   supabase_functions_url = https://<ref>.supabase.co/functions/v1
--   notification_dispatch_secret = <shared secret>
-- Edge function should have verify_jwt = false (see function config).
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

  IF v_base_url IS NULL OR btrim(v_base_url) = '' THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/notification-dispatch',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'notification_id', p_notification_id,
        'secret', coalesce(v_secret, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      PERFORM extensions.http_post(
        url := rtrim(v_base_url, '/') || '/notification-dispatch',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'notification_id', p_notification_id,
          'secret', coalesce(v_secret, '')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END;
$$;
