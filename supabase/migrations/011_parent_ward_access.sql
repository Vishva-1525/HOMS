-- Parents: read ward profiles, gate logs, and extension requests

CREATE POLICY "Parents can read ward profiles"
  ON public.profiles FOR SELECT
  USING (
    public.current_user_role() = 'parent'
    AND public.is_parent_of_student(profiles.id)
  );

DROP POLICY IF EXISTS "Authorized roles can read gate logs" ON public.gate_logs;

CREATE POLICY "Authorized roles can read gate logs"
  ON public.gate_logs FOR SELECT
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('warden', 'security_guard')
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.student_id = public.current_student_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND public.is_parent_of_student(o.student_id)
    )
  );

DROP POLICY IF EXISTS "Students can read own extension requests" ON public.extension_requests;

CREATE POLICY "Students and parents can read extension requests"
  ON public.extension_requests FOR SELECT
  USING (
    public.is_admin()
    OR public.current_user_role() = 'warden'
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND o.student_id = public.current_student_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_id
        AND public.is_parent_of_student(o.student_id)
    )
  );

CREATE OR REPLACE FUNCTION public.get_student_admission_no(p_student_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF public.current_user_role() = 'security_guard'
    OR public.current_user_role() = 'warden'
    OR public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'student' AND p_student_id = auth.uid())
    OR (public.current_user_role() = 'parent' AND public.is_parent_of_student(p_student_id))
  THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT u.email INTO v_email
  FROM public.students s
  JOIN auth.users u ON u.id = s.id
  WHERE s.id = p_student_id;

  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN split_part(v_email, '@', 1);
END;
$$;
