-- Gate scanner: student display info (name from profiles, room/block from students)

CREATE OR REPLACE FUNCTION public.get_student_gate_info(p_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF public.current_user_role() NOT IN ('security_guard', 'warden', 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'full_name', COALESCE(p.full_name, ''),
    'room_number', COALESCE(s.room_number, ''),
    'hostel_block', COALESCE(s.hostel_block, ''),
    'reg_number', COALESCE(s.reg_number, '')
  )
  INTO v_result
  FROM public.students s
  LEFT JOIN public.profiles p ON p.id = s.id
  WHERE s.id = p_student_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_gate_info(UUID) TO authenticated;
