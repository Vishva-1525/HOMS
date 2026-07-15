import type { PassType, SpecialPassPurpose, AcademicCalendarDay } from '@/lib/types'
import {
  getDateRestrictionMessage,
  isDateSelectableForOutpass,
  toDateKey,
} from '@/lib/academic-calendar'
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
export const OUTPASS_MAX_HOURS = 8
export const NIGHT_PASS_MAX_HOURS = 78
export const SPECIAL_PASS_MAX_DAYS = 7
export const STAYPASS_MIN_DAYS = 1
export const STAYPASS_MAX_DAYS = 2

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarDaysBetween(departure: Date, returnDate: Date): number {
  const diff = startOfLocalDay(returnDate).getTime() - startOfLocalDay(departure).getTime()
  return Math.round(diff / DAY_MS)
}

function validateCalendarDate(
  dateIso: string,
  calendarMap: Map<string, AcademicCalendarDay> | undefined,
): string | null {
  if (!calendarMap || calendarMap.size === 0) return null
  const dateKey = toDateKey(new Date(dateIso))
  if (!isDateSelectableForOutpass(dateKey, calendarMap)) {
    return getDateRestrictionMessage(dateKey, calendarMap) ?? 'This date is not available.'
  }
  return null
}

export function getPassTypeDurationHint(passType: PassType | null): string | null {
  switch (passType) {
    case 'outpass':
      return `Outpass: return the same day, within ${OUTPASS_MAX_HOURS} hours of departure.`
    case 'staypass':
      return 'Staypass: return 1–2 days after departure.'
    case 'night_pass':
      return `Night Pass: return within ${NIGHT_PASS_MAX_HOURS} hours of departure.`
    case 'special_pass':
      return `Special Pass: return within ${SPECIAL_PASS_MAX_DAYS} days of departure.`
    default:
      return null
  }
}

export function validateNewRequestForm(
  values: NewRequestFormValues,
  calendarMap?: Map<string, AcademicCalendarDay>,
): NewRequestFormErrors {
  const errors: NewRequestFormErrors = {}

  if (!values.passType) {
    errors.passType = 'Please select a pass type.'
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

  const departureRestriction = validateCalendarDate(values.departureAt, calendarMap)
  if (departureRestriction) errors.departureAt = departureRestriction

  const returnRestriction = validateCalendarDate(values.returnBy, calendarMap)
  if (returnRestriction) errors.returnBy = returnRestriction

  if (errors.departureAt || errors.returnBy || !values.passType) {
    return errors
  }

  const daysApart = calendarDaysBetween(departure, returnDate)
  const hoursApart = (returnDate.getTime() - departure.getTime()) / HOUR_MS

  switch (values.passType) {
    case 'outpass':
      if (daysApart !== 0) {
        errors.returnBy = 'Outpass: return must be on the same day as departure.'
      } else if (hoursApart > OUTPASS_MAX_HOURS) {
        errors.returnBy = `Outpass: return must be within ${OUTPASS_MAX_HOURS} hours of departure.`
      }
      break
    case 'staypass':
      if (daysApart < STAYPASS_MIN_DAYS || daysApart > STAYPASS_MAX_DAYS) {
        errors.returnBy = 'Staypass: return must be 1–2 days after departure.'
      }
      break
    case 'night_pass': {
      if (hoursApart > NIGHT_PASS_MAX_HOURS) {
        errors.returnBy = `Night Pass: return must be within ${NIGHT_PASS_MAX_HOURS} hours of departure.`
      }
      break
    }
    case 'special_pass': {
      if (daysApart < 0 || daysApart > SPECIAL_PASS_MAX_DAYS) {
        errors.returnBy = `Special Pass: return must be within ${SPECIAL_PASS_MAX_DAYS} days of departure.`
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
): { min?: string; max?: string } {
  if (!passType || !departureAt) return {}

  const departure = new Date(departureAt)
  if (Number.isNaN(departure.getTime())) return {}

  const min = new Date(departure.getTime() + 60_000)

  switch (passType) {
    case 'outpass': {
      const endOfDay = new Date(departure)
      endOfDay.setHours(23, 59, 0, 0)
      const eightHours = new Date(departure.getTime() + OUTPASS_MAX_HOURS * HOUR_MS)
      const max = eightHours.getTime() < endOfDay.getTime() ? eightHours : endOfDay
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
    case 'staypass': {
      const nextDay = new Date(departure)
      nextDay.setDate(nextDay.getDate() + STAYPASS_MIN_DAYS)
      nextDay.setHours(0, 0, 0, 0)
      const stayMin = nextDay.getTime() > min.getTime() ? nextDay : min
      const max = new Date(departure)
      max.setDate(max.getDate() + STAYPASS_MAX_DAYS)
      max.setHours(23, 59, 0, 0)
      return { min: toDatetimeLocalValue(stayMin), max: toDatetimeLocalValue(max) }
    }
    case 'night_pass': {
      const max = new Date(departure.getTime() + NIGHT_PASS_MAX_HOURS * HOUR_MS)
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
    case 'special_pass': {
      const max = new Date(departure)
      max.setDate(max.getDate() + SPECIAL_PASS_MAX_DAYS)
      max.setHours(23, 59, 0, 0)
      return { min: toDatetimeLocalValue(min), max: toDatetimeLocalValue(max) }
    }
  }
}
