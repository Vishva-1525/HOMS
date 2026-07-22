import { normalizeHostelBlock } from '@/lib/block-display'
import type { HostelGender, OutpassWithStudent } from '@/lib/types'
import type { ExtensionWithOutpass } from '@/lib/types'

export interface WardenScope {
  block: string
  gender: HostelGender
}

export function passMatchesWardenScope(
  pass: OutpassWithStudent,
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  const student = pass.students
  if (!student) return false
  return (
    normalizeHostelBlock(student.hostel_block) === normalizeHostelBlock(scope.block)
    && student.gender === scope.gender
  )
}

export function extensionMatchesWardenScope(
  extension: ExtensionWithOutpass,
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  const student = extension.outpass_requests?.students
  if (!student) return false
  return (
    normalizeHostelBlock(student.hostel_block) === normalizeHostelBlock(scope.block)
    && student.gender === scope.gender
  )
}

export function violationMatchesWardenScope(
  violation: { hostel_block: string; gender?: HostelGender | null },
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  if (violation.gender && violation.gender !== scope.gender) return false
  return normalizeHostelBlock(violation.hostel_block) === normalizeHostelBlock(scope.block)
}
