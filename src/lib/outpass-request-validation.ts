import type { PassType } from '@/lib/types'

export interface NewRequestFormValues {
  passType: PassType | null
  destination: string
  reason: string
  departureAt: string
  returnBy: string
}

export type NewRequestFormErrors = Partial<Record<keyof NewRequestFormValues | 'submit', string>>

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const NIGHT_PASS_MAX_HOURS = 78

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarDaysBetween(departure: Date, returnDate: Date): number {
  const diff = startOfLocalDay(returnDate).getTime() - startOfLocalDay(departure).getTime()
  return Math.round(diff / DAY_MS)
}

export function validateNewRequestForm(values: NewRequestFormValues): NewRequestFormErrors {
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

  switch (values.passType) {
    case 'outpass':
      if (daysApart !== 0) {
        errors.returnBy = 'Outpass: return must be on the same day as departure.'
      }
      break
    case 'staypass':
      if (daysApart < 1 || daysApart > 2) {
        errors.returnBy = 'Staypass: return must be 1–2 days after departure.'
      }
      break
    case 'night_pass': {
      const hoursApart = (returnDate.getTime() - departure.getTime()) / HOUR_MS
      if (hoursApart > NIGHT_PASS_MAX_HOURS) {
        errors.returnBy = 'Night Pass: return must be within 78 hours of departure.'
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
  )
}

export const INITIAL_NEW_REQUEST_FORM: NewRequestFormValues = {
  passType: null,
  destination: '',
  reason: '',
  departureAt: '',
  returnBy: '',
}
