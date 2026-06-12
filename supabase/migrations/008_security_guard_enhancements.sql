-- Security guard: read students/profiles, extended passes, gate logs, warden alerts

CREATE POLICY "Security guards can read students"
  ON public.students FOR SELECT
  USING (public.current_user_role() = 'security_guard');

CREATE POLICY "Security guards can read student profiles"
  ON public.profiles FOR SELECT
  USING (
    public.current_user_role() = 'security_guard'
    AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = profiles.id
    )
  );

DROP POLICY IF EXISTS "Students can read own outpass requests" ON public.outpass_requests;

CREATE POLICY "Students can read own outpass requests"
  ON public.outpass_requests FOR SELECT
  USING (
    student_id = public.current_student_id()
    OR public.current_user_role() IN ('warden', 'admin')
    OR (
      public.current_user_role() = 'security_guard'
      AND status IN ('approved', 'extended')
    )
    OR public.is_parent_of_student(student_id)
  );

DROP POLICY IF EXISTS "Security guards can insert gate logs" ON public.gate_logs;

CREATE POLICY "Security guards can insert gate logs"
  ON public.gate_logs FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'security_guard'
    AND scanned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.status IN ('approved', 'extended')
    )
  );

CREATE OR REPLACE FUNCTION public.alert_warden_overdue(
  p_reg_number TEXT,
  p_student_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() != 'security_guard' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.notifications_log (user_id, type, message)
  SELECT
    id,
    'warning',
    'Overdue student at gate: ' || COALESCE(p_student_name, 'Unknown') || ' (' || COALESCE(p_reg_number, '—') || ')'
  FROM public.profiles
  WHERE role = 'warden';
END;
$$;

GRANT EXECUTE ON FUNCTION public.alert_warden_overdue(TEXT, TEXT) TO authenticated;
