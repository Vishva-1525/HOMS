import type { PassType, SpecialPassPurpose, AcademicCalendarDay } from '@/lib/types'
import {
  DEFAULT_PASS_LIMITS,
  type PassValidationLimits,
} from '@/lib/pass-limits'
import { specialPassPurposeRequiresDocument } from '@/lib/special-pass'

export interface NewRequestFormValues {
  passType: PassType | null
  destination: string
  reason: string
  departureAt: string
  returnBy: string
  specialPurpose: SpecialPassPurpose | null
  specialRemarks: string
  documentFile: File | null
}

export type NewRequestFormErrors = Partial<Record<keyof NewRequestFormValues | 'submit', string>>

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** Default limits - overridden by `get_student_pass_limits` when available. */
export const OUTPASS_MAX_HOURS = DEFAULT_PASS_LIMITS.maxOutpassHours
export const SPECIAL_PASS_MAX_DAYS = DEFAULT_PASS_LIMITS.maxSpecialPassDays
export const INTERNSHIP_MAX_DAYS = DEFAULT_PASS_LIMITS.maxInternshipDays
export const STAYPASS_PICKER_MAX_DAYS = 365

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarDaysBetween(departure: Date, returnDate: Date): number {
  const diff = startOfLocalDay(returnDate).getTime() - startOfLocalDay(departure).getTime()
  return Math.round(diff / DAY_MS)
}

function maxDaysForSpecialPurpose(
  purpose: SpecialPassPurpose | null,
  limits: PassValidationLimits,
): number {
  return purpose === 'internship' ? limits.maxInternshipDays : limits.maxSpecialPassDays
}

export function getPassTypeDurationHint(
  passType: PassType | null,
  specialPurpose: SpecialPassPurpose | null = null,
  limits: PassValidationLimits = DEFAULT_PASS_LIMITS,
): string | null {
  switch (passType) {
    case 'outpass':
      return `Outpass: return within ${limits.maxOutpassHours} hours of departure.`
    case 'staypass':
      return 'Stay Pass: no maximum duration - set any return after departure.'
    case 'special_pass':
      if (specialPurpose === 'internship') {
        return `Internship: QR valid up to ${limits.maxInternshipDays} days - reusable for daily exit and entry.`
      }
      return `Special Pass: return within ${limits.maxSpecialPassDays} days of departure.`
    case 'night_pass':
      return 'Night Pass is no longer available.'
    default:
      return null
  }
}

export function validateNewRequestForm(
  values: NewRequestFormValues,
  _calendarMap?: Map<string, AcademicCalendarDay>,
  limits: PassValidationLimits = DEFAULT_PASS_LIMITS,
): NewRequestFormErrors {
  const errors: NewRequestFormErrors = {}

  if (!values.passType) {
    errors.passType = 'Please select a pass type.'
  } else if (values.passType === 'night_pass') {
    errors.passType = 'Night Pass is no longer available.'
  }

  if (!values.destination.trim()) {
    errors.destination = 'Destination is required.'
  }

  if (!values.reason.trim()) {
    errors.reason = 'Reason is required.'
  }

  if (values.passType === 'special_pass') {
    if (!values.specialPurpose) {
      errors.specialPurpose = 'Please select a purpose.'
    } else if (values.specialPurpose === 'industrial_visit') {
      errors.specialPurpose = 'Industrial Visit is no longer available.'
    }
    if (values.specialPurpose === 'other' && !values.specialRemarks.trim()) {
      errors.specialRemarks = 'Remarks are required for Other purpose.'
    }
    if (specialPassPurposeRequiresDocument(values.specialPurpose) && !values.documentFile) {
      errors.documentFile = 'Please upload a supporting document (PDF or image).'
    }
  }

  if (!values.departureAt) {
    errors.departureAt = 'Departure date and time is required.'
  }

  if (!values.returnBy) {
    errors.returnBy = 'Return date and time is required.'
  }

  if (errors.departureAt || errors.returnBy) {
    return errors
  }

  const departure = new Date(values.departureAt)
  const returnDate = new Date(values.returnBy)
  const now = new Date()

  if (Number.isNaN(departure.getTime())) {
    errors.departureAt = 'Invalid departure date and time.'
    return errors
  }

  if (Number.isNaN(returnDate.getTime())) {
    errors.returnBy = 'Invalid return date and time.'
    return errors
  }

  if (departure.getTime() <= now.getTime()) {
    errors.departureAt = 'Departure must be in the future.'
  }

  if (returnDate.getTime() <= departure.getTime()) {
    errors.returnBy = 'Return must be after departure.'
  }

  if (errors.departureAt || errors.returnBy || !values.passType) {
    return errors
  }

  const daysApart = calendarDaysBetween(departure, returnDate)
  const hoursApart = (returnDate.getTime() - departure.getTime()) / HOUR_MS

  switch (values.passType) {
    case 'outpass':
      if (hoursApart > limits.maxOutpassHours) {
        errors.returnBy = `Outpass: return must be within ${limits.maxOutpassHours} hours of departure.`
      }
      break
    case 'staypass':
      break
    case 'night_pass':
      errors.passType = 'Night Pass is no longer available.'
      break
    case 'special_pass': {
      const maxDays = maxDaysForSpecialPurpose(values.specialPurpose, limits)
      if (daysApart < 0 || daysApart > maxDays) {
        const label = values.specialPurpose === 'internship' ? 'Internship' : 'Special Pass'
        errors.returnBy = `${label}: return must be within ${maxDays} days of departure.`
      }
      break
    }
  }

  return errors
}

export function isNewRequestFormDirty(values: NewRequestFormValues): boolean {
  return (
    values.passType !== null
    || values.destination.trim() !== ''
    || values.reason.trim() !== ''
    || values.departureAt !== ''
    || values.returnBy !== ''
    || values.specialPurpose !== null
    || values.specialRemarks.trim() !== ''
    || values.documentFile !== null
  )
}

export const INITIAL_NEW_REQUEST_FORM: NewRequestFormValues = {
  passType: null,
  destination: '',
  reason: '',
  departureAt: '',
  returnBy: '',
  specialPurpose: null,
  specialRemarks: '',
  documentFile: null,
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getReturnDatetimeBounds(
  passType: PassType | null,
  departureAt: string,
  specialPurpose: SpecialPassPurpose | null = null,
  limits: PassValidationLimits = DEFAULT_PASS_LIMITS,
): { min?: string; max?: string } {
  if (!passType || !departureAt) return {}

  const departure = new Date(departureAt)
  if (Number.isNaN(departure.getTime())) return {}

  const min = new Date(departure.getTime() + 60_000)

  switch (passType) {
    case 'outpass': {
      const max = new Date(departure.getTime() + limits.maxOutpassHours * HOUR_MS)
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
    case 'staypass': {
      const max = new Date(departure)
      max.setDate(max.getDate() + STAYPASS_PICKER_MAX_DAYS)
      max.setHours(23, 59, 0, 0)
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
    case 'special_pass': {
      const maxDays = maxDaysForSpecialPurpose(specialPurpose, limits)
      const max = new Date(departure)
      max.setDate(max.getDate() + maxDays)
      max.setHours(23, 59, 0, 0)
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
    case 'night_pass':
      return { min: toDatetimeLocalValue(min) }
  }
}
