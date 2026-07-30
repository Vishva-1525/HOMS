import { useStudentDataContext } from '@/contexts/StudentDataContext'

/** @deprecated Pass quotas removed - kept as a thin alias for shared cache loading state. */
export function useStudentPassQuotas() {
  const { loading, error, refetch } = useStudentDataContext()
  return { loading, error, refetch }
}
