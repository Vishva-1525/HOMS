-- Wardens need student names when reviewing outpass requests

CREATE POLICY "Wardens can read student profiles"
  ON public.profiles FOR SELECT
  USING (
    public.current_user_role() IN ('warden', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = profiles.id
    )
  );
