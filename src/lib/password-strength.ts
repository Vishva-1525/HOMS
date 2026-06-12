export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong'

export interface PasswordStrength {
  level: PasswordStrengthLevel
  score: number
  label: string
  color: string
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: 'weak', score: 0, label: 'Enter a password', color: '#E5E7EB' }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) {
    return { level: 'weak', score, label: 'Weak', color: '#DC2626' }
  }
  if (score <= 3) {
    return { level: 'fair', score, label: 'Fair', color: '#E87722' }
  }
  return { level: 'strong', score, label: 'Strong', color: '#2E8B44' }
}
