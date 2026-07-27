import { normalizeHostelBlock } from '@/lib/block-display'
import type { HostelGender, OutpassWithStudent } from '@/lib/types'
import type { ExtensionWithOutpass } from '@/lib/types'

export type WardenTier = 'rt' | 'superior'

export interface WardenScope {
  tier: WardenTier
  /** Block assignment — null for superior wardens (all escalated blocks). */
  block: string | null
  gender: HostelGender
  isAvailable: boolean
  unavailableReason: string | null
  /** Normalized blocks whose RT is Away (superior scope only). */
  escalatedBlocks: string[]
  /** False when RT is Away — UI is read-only; superiors can always approve. */
  canApprove: boolean
}

export function passMatchesWardenScope(
  pass: OutpassWithStudent,
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  const student = pass.students
  if (!student) return false
  if (student.gender !== scope.gender) return false

  if (scope.tier === 'superior') {
    const block = normalizeHostelBlock(student.hostel_block)
    return scope.escalatedBlocks.includes(block)
  }

  if (!scope.block) return false
  return normalizeHostelBlock(student.hostel_block) === normalizeHostelBlock(scope.block)
}

export function extensionMatchesWardenScope(
  extension: ExtensionWithOutpass,
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  const student = extension.outpass_requests?.students
  if (!student) return false
  if (student.gender !== scope.gender) return false

  if (scope.tier === 'superior') {
    const block = normalizeHostelBlock(student.hostel_block)
    return scope.escalatedBlocks.includes(block)
  }

  if (!scope.block) return false
  return normalizeHostelBlock(student.hostel_block) === normalizeHostelBlock(scope.block)
}

export function violationMatchesWardenScope(
  violation: { hostel_block: string; gender?: HostelGender | null },
  scope: WardenScope | null,
): boolean {
  if (!scope) return false
  if (violation.gender && violation.gender !== scope.gender) return false

  if (scope.tier === 'superior') {
    return scope.escalatedBlocks.includes(normalizeHostelBlock(violation.hostel_block))
  }

  if (!scope.block) return false
  return normalizeHostelBlock(violation.hostel_block) === normalizeHostelBlock(scope.block)
}
