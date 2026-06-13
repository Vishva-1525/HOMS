-- Security guards: read extension requests for gate entry checks

CREATE POLICY "Security guards can read extension requests"
  ON public.extension_requests FOR SELECT
  USING (
    public.current_user_role() = 'security_guard'
    AND EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.status IN ('approved', 'extended')
    )
  );

CREATE OR REPLACE FUNCTION public.alert_warden_overdue(
  p_reg_number TEXT,
  p_student_name TEXT,
  p_detail TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message TEXT;
BEGIN
  IF public.current_user_role() != 'security_guard' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_message := 'Overdue student at gate: '
    || COALESCE(p_student_name, 'Unknown')
    || ' ('
    || COALESCE(p_reg_number, '—')
    || ')';

  IF p_detail IS NOT NULL AND length(trim(p_detail)) > 0 THEN
    v_message := v_message || ' — ' || trim(p_detail);
  END IF;

  INSERT INTO public.notifications_log (user_id, type, message)
  SELECT id, 'warning', v_message
  FROM public.profiles
  WHERE role = 'warden';
END;
$$;
