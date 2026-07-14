-- Fast lookup + filter option RPC for admin student list boot

CREATE INDEX IF NOT EXISTS idx_students_is_active_reg
  ON public.students (is_active, reg_number);

CREATE INDEX IF NOT EXISTS idx_students_hostel_block_active
  ON public.students (hostel_block)
  WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_students_department_active
  ON public.students (department)
  WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_students_year_active
  ON public.students (year_of_study)
  WHERE is_active IS TRUE;

-- Single round-trip for admin Students page header filters + summary chips.
-- Avoids pulling thousands of hostel_block/department row fragments to the client.
CREATE OR REPLACE FUNCTION public.get_student_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'blocks',
      COALESCE(
        (
          SELECT jsonb_agg(b ORDER BY b)
          FROM (
            SELECT DISTINCT hostel_block AS b
            FROM public.students
            WHERE COALESCE(is_active, true)
              AND hostel_block IS NOT NULL
              AND btrim(hostel_block) <> ''
          ) t
        ),
        '[]'::jsonb
      ),
    'departments',
      COALESCE(
        (
          SELECT jsonb_agg(d ORDER BY d)
          FROM (
            SELECT DISTINCT department AS d
            FROM public.students
            WHERE COALESCE(is_active, true)
              AND department IS NOT NULL
              AND btrim(department) <> ''
          ) t
        ),
        '[]'::jsonb
      ),
    'active_count',
      (SELECT count(*)::int FROM public.students WHERE COALESCE(is_active, true)),
    'outside_count',
      (
        SELECT count(*)::int
        FROM public.student_campus_status
        WHERE current_status = 'outside'
      ),
    'overdue_count',
      (
        SELECT count(*)::int
        FROM public.student_campus_status
        WHERE current_status = 'overdue'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_student_filter_options() TO authenticated;

COMMENT ON FUNCTION public.get_student_filter_options() IS
  'Distinct blocks/departments + campus summary counts for admin student filters.';
