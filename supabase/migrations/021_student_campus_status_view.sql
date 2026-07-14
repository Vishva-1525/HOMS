-- Server-side campus status for admin student list (avoids client-side pass/log joins)

CREATE OR REPLACE VIEW public.student_campus_status
WITH (security_invoker = true)
AS
SELECT
  s.id AS student_id,
  s.reg_number,
  COALESCE(p.full_name, '') AS full_name,
  s.hostel_block,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.outpass_requests o
      WHERE o.student_id = s.id
        AND o.status IN ('approved', 'extended')
        AND EXISTS (
          SELECT 1
          FROM public.gate_logs gl_exit
          WHERE gl_exit.outpass_id = o.id
            AND gl_exit.event_type = 'exit'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.gate_logs gl_entry
          WHERE gl_entry.outpass_id = o.id
            AND gl_entry.event_type = 'entry'
        )
        AND (
          o.is_overdue = true
          OR o.return_by < now()
        )
    ) THEN 'overdue'
    WHEN EXISTS (
      SELECT 1
      FROM public.outpass_requests o
      WHERE o.student_id = s.id
        AND o.status IN ('approved', 'extended')
        AND EXISTS (
          SELECT 1
          FROM public.gate_logs gl_exit
          WHERE gl_exit.outpass_id = o.id
            AND gl_exit.event_type = 'exit'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.gate_logs gl_entry
          WHERE gl_entry.outpass_id = o.id
            AND gl_entry.event_type = 'entry'
        )
    ) THEN 'outside'
    ELSE 'inside'
  END AS current_status
FROM public.students s
JOIN public.profiles p ON p.id = s.id;

GRANT SELECT ON public.student_campus_status TO authenticated;

COMMENT ON VIEW public.student_campus_status IS
  'Lightweight campus presence status for students; used by admin student list pagination.';
