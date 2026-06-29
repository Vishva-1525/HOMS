import type { GateLog, OutpassRequest } from '@/lib/types'
import { classifyPass } from '@/lib/pass-classification'

export type PassStatsPeriod = 'weekly' | 'monthly' | 'yearly'

export interface PassPeriodStats {
  period: PassStatsPeriod
  pending: number
  approved: number
  rejected: number
  overdue: number
}

export interface PassPeriodStatsRpc {
  period: string
  period_start: string
  pending: number
  approved: number
  rejected: number
  overdue: number
}

function periodStart(period: PassStatsPeriod, now = new Date()): Date {
  const d = new Date(now)
  if (period === 'weekly') {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'yearly') {
    return new Date(d.getFullYear(), 0, 1)
  }
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function computePassPeriodStats(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
  period: PassStatsPeriod,
): PassPeriodStats {
  const start = periodStart(period).getTime()
  const inPeriod = passes.filter((p) => new Date(p.created_at).getTime() >= start)

  return {
    period,
    pending: inPeriod.filter((p) => classifyPass(p, gateLogs) === 'pending').length,
    approved: inPeriod.filter((p) => {
      const c = classifyPass(p, gateLogs)
      return c === 'approved' || c === 'return_completed'
    }).length,
    rejected: inPeriod.filter((p) => p.status === 'rejected').length,
    overdue: inPeriod.filter((p) => classifyPass(p, gateLogs) === 'overdue').length,
  }
}
