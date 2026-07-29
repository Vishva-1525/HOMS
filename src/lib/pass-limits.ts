export interface PassValidationLimits {
  maxOutpassHours: number
  maxSpecialPassDays: number
  maxInternshipDays: number
  stayPassUnlimited: boolean
}

export const DEFAULT_PASS_LIMITS: PassValidationLimits = {
  maxOutpassHours: 24,
  maxSpecialPassDays: 7,
  maxInternshipDays: 15,
  stayPassUnlimited: true,
}

export function parsePassLimitsFromSettings(
  settings: Record<string, string> | null | undefined,
): PassValidationLimits {
  const maxStay = Number(settings?.max_staypass_days)
  return {
    maxOutpassHours: Number(settings?.max_outpass_hours) || DEFAULT_PASS_LIMITS.maxOutpassHours,
    maxSpecialPassDays:
      Number(settings?.max_special_pass_days) || DEFAULT_PASS_LIMITS.maxSpecialPassDays,
    maxInternshipDays:
      Number(settings?.max_internship_days) || DEFAULT_PASS_LIMITS.maxInternshipDays,
    stayPassUnlimited: !Number.isFinite(maxStay) || maxStay === 0,
  }
}
