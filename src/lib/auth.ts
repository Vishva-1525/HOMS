import { edgeFunctionErrorMessage } from '@/lib/edge-function-error'
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

async function invokePasswordReset(
  name: 'password-reset-request' | 'password-reset-verify' | 'password-reset-confirm',
  body: Record<string, string>,
  fallback: string,
): Promise<{ message?: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) throw new Error(await edgeFunctionErrorMessage(error, fallback))
  if (data?.error) throw new Error(String(data.error))
  return (data ?? {}) as { message?: string }
}

function normalizeResetIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  return isEmailIdentifier(trimmed) ? trimmed.toLowerCase() : trimmed.toUpperCase()
}

/** Send a 6-digit verification code to the account email (email or register number). */
export async function requestPasswordResetOtp(identifier: string): Promise<string> {
  const data = await invokePasswordReset(
    'password-reset-request',
    { identifier: normalizeResetIdentifier(identifier) },
    'Could not send the verification code. Please try again.',
  )
  return data.message ?? 'Verification code sent. Check your inbox.'
}

/** Confirm the verification code before allowing a new password. */
export async function verifyPasswordResetOtp(identifier: string, otp: string): Promise<void> {
  await invokePasswordReset(
    'password-reset-verify',
    { identifier: normalizeResetIdentifier(identifier), otp: otp.trim() },
    'Verification failed. Please try again.',
  )
}

/** Set a new password after OTP verification and send a confirmation email. */
export async function confirmPasswordResetWithOtp(
  identifier: string,
  otp: string,
  newPassword: string,
): Promise<string> {
  const data = await invokePasswordReset(
    'password-reset-confirm',
    {
      identifier: normalizeResetIdentifier(identifier),
      otp: otp.trim(),
      new_password: newPassword,
    },
    'Failed to reset password. Please try again.',
  )
  return data.message ?? 'Your password has been updated.'
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
