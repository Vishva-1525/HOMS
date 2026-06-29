import type { OutpassRequest, StudentPassQuotas } from '@/lib/types'

const APPROVED_STATUSES = new Set(['approved', 'extended'])

function passTimestamp(pass: OutpassRequest): number {
  return new Date(pass.approved_at ?? pass.created_at).getTime()
}

function weekStart(date: Date): Date {
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function isInSameWeek(pass: OutpassRequest, reference: Date): boolean {
  const passDate = new Date(pass.approved_at ?? pass.created_at)
  return weekStart(passDate).getTime() === weekStart(reference).getTime()
}

function isInSameMonth(pass: OutpassRequest, reference: Date): boolean {
  const passDate = new Date(pass.approved_at ?? pass.created_at)
  return (
    passDate.getFullYear() === reference.getFullYear()
    && passDate.getMonth() === reference.getMonth()
  )
}

function approvedPassesInPeriod(
  passes: OutpassRequest[],
  reference: Date,
  period: 'week' | 'month',
): OutpassRequest[] {
  return passes
    .filter((pass) => {
      if (!APPROVED_STATUSES.has(pass.status)) return false
      return period === 'week' ? isInSameWeek(pass, reference) : isInSameMonth(pass, reference)
    })
    .sort((a, b) => passTimestamp(a) - passTimestamp(b))
}

export interface PassSequenceInfo {
  weekly: { current: number; limit: number } | null
  monthly: { current: number; limit: number } | null
}

export function getPassSequenceInfo(
  pass: OutpassRequest,
  allPasses: OutpassRequest[],
  quotas: Pick<StudentPassQuotas, 'weekly_limit' | 'monthly_limit'>,
): PassSequenceInfo {
  if (!APPROVED_STATUSES.has(pass.status)) {
    return { weekly: null, monthly: null }
  }

  const reference = new Date(pass.approved_at ?? pass.created_at)
  const weeklyPasses = approvedPassesInPeriod(allPasses, reference, 'week')
  const monthlyPasses = approvedPassesInPeriod(allPasses, reference, 'month')

  const weeklyIndex = weeklyPasses.findIndex((item) => item.id === pass.id)
  const monthlyIndex = monthlyPasses.findIndex((item) => item.id === pass.id)

  return {
    weekly:
      weeklyIndex >= 0
        ? { current: weeklyIndex + 1, limit: quotas.weekly_limit }
        : null,
    monthly:
      monthlyIndex >= 0
        ? { current: monthlyIndex + 1, limit: quotas.monthly_limit }
        : null,
  }
}

export function formatPassSequenceLabel(
  sequence: { current: number; limit: number } | null,
  period: 'Weekly' | 'Monthly',
): string | null {
  if (!sequence) return null
  return `${period} Pass: ${sequence.current} of ${sequence.limit}`
}
