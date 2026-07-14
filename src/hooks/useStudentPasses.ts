import { useStudentDataContext } from '@/contexts/StudentDataContext'

/** @deprecated Prefer useStudentDataContext — kept as a thin alias for shared cache. */
export function useStudentPasses() {
  const { passes, gateLogs, extensions, student, loading, error, refetch } = useStudentDataContext()
  return { passes, gateLogs, extensions, student, loading, error, refetch }
}
