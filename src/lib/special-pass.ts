import type { SpecialPassPurpose } from '@/lib/types'

export const SPECIAL_PASS_PURPOSES: {
  value: SpecialPassPurpose
  label: string
  requiresDocument: boolean
}[] = [
  { value: 'internship', label: 'Internship', requiresDocument: true },
  { value: 'hackathon', label: 'Hackathon', requiresDocument: true },
  { value: 'sports_event', label: 'Sports Event', requiresDocument: true },
  { value: 'industrial_visit', label: 'Industrial Visit', requiresDocument: true },
  { value: 'other', label: 'Other', requiresDocument: false },
]

export const SPECIAL_PASS_PURPOSE_LABELS: Record<SpecialPassPurpose, string> = {
  internship: 'Internship',
  hackathon: 'Hackathon',
  sports_event: 'Sports Event',
  industrial_visit: 'Industrial Visit',
  other: 'Other',
}

export function specialPassPurposeRequiresDocument(purpose: SpecialPassPurpose | null): boolean {
  if (!purpose) return false
  return purpose !== 'other'
}

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024
