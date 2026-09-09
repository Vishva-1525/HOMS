import { supabase } from '@/lib/supabase'

export function isEmailIdentifier(identifier: string): boolean {
  return identifier.trim().includes('@')
}

export async function resolveLoginEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim()

  if (isEmailIdentifier(trimmed)) {
    return trimmed.toLowerCase()
  }

  const { data, error } = await supabase.rpc('get_student_login_email', {
    reg_number_input: trimmed,
  })

  if (error || !data) {
    throw new Error('No student found with that register number.')
  }

  return data as string
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const email = await resolveLoginEmail(identifier)
  let { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Student default passwords use register numbers (often uppercase in imports).
  if (error && password !== password.toUpperCase()) {
    const retry = await supabase.auth.signInWithPassword({
      email,
      password: password.toUpperCase(),
    })
    if (!retry.error) {
      data = retry.data
      error = null
    }
  }

  if (error) throw error
  return data
}

function edgeFunctionErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

/** Send a 6-digit verification code to the account email. */
export async function requestPasswordResetOtp(email: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('password-reset-request', {
    body: { email: email.trim().toLowerCase() },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return (data?.message as string) ?? 'If an account exists for that email, a verification code has been sent.'
}

/** Confirm the verification code before allowing a new password. */
export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('password-reset-verify', {
    body: {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    },
  })

  if (error) throw new Error(edgeFunctionErrorMessage(data, error.message || 'Verification failed.'))
  if (data?.error) throw new Error(String(data.error))
}

/** Set a new password after OTP verification and send a confirmation email. */
export async function confirmPasswordResetWithOtp(
  email: string,
  otp: string,
  newPassword: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('password-reset-confirm', {
    body: {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      new_password: newPassword,
    },
  })

  if (error) throw new Error(edgeFunctionErrorMessage(data, error.message || 'Failed to reset password.'))
  if (data?.error) throw new Error(String(data.error))

  return (data?.message as string) ?? 'Your password has been updated.'
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** Re-check the signed-in user's password before sensitive profile changes. */
export async function verifyCurrentPassword(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !password) {
    throw new Error('Enter your current password to continue.')
  }

  let { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  // Student default passwords use register numbers (often uppercase in imports).
  if (error && password !== password.toUpperCase()) {
    const retry = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: password.toUpperCase(),
    })
    error = retry.error
  }

  if (error) {
    throw new Error('Current password is incorrect.')
  }
}

export async function markPasswordChanged(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ password_changed: true })
    .eq('id', userId)

  if (error) throw error
}

/** Students update their own phone on profiles (parent_phone is never writable by students). */
export async function updateOwnPhone(userId: string, phone: string) {
  const trimmed = phone.trim()
  if (!trimmed) throw new Error('Phone number is required.')
  if (!/^[0-9+\-\s()]{8,20}$/.test(trimmed)) {
    throw new Error('Enter a valid phone number.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ phone: trimmed })
    .eq('id', userId)

  if (error) throw error
}
