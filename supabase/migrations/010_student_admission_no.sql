-- Gate verification: admission number from auth email via student/profile id

CREATE OR REPLACE FUNCTION public.get_student_admission_no(p_student_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF public.current_user_role() NOT IN ('security_guard', 'warden', 'admin') THEN
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

GRANT EXECUTE ON FUNCTION public.get_student_admission_no(UUID) TO authenticated;
