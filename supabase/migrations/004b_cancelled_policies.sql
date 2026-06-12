-- Policies that reference the 'cancelled' enum value (must run after 004 is committed)

-- Students may read profiles of wardens who approved their passes
CREATE POLICY "Students can read approver profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.outpass_requests o
      WHERE o.approved_by = profiles.id
        AND o.student_id = public.current_student_id()
    )
  );

-- Allow students to cancel pending requests (WITH CHECK must permit 'cancelled')
DROP POLICY IF EXISTS "Students can update own pending outpass requests" ON public.outpass_requests;

CREATE POLICY "Students can update own pending outpass requests"
  ON public.outpass_requests FOR UPDATE
  USING (
    (student_id = public.current_student_id() AND status = 'pending')
    OR public.current_user_role() = 'warden'
    OR public.is_admin()
  )
  WITH CHECK (
    (student_id = public.current_student_id() AND status IN ('pending', 'cancelled'))
    OR public.current_user_role() = 'warden'
    OR public.is_admin()
  );
