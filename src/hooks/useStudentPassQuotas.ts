import { useStudentDataContext } from '@/contexts/StudentDataContext'

/** @deprecated Prefer useStudentDataContext — kept as a thin alias for shared cache. */
export function useStudentPassQuotas() {
  const { quotas, loading, error, refetch } = useStudentDataContext()
  return { quotas, loading, error, refetch }
}
