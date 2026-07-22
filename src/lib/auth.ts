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

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}

export async function requestStudentPasswordReset(regNumber: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('student-forgot-password', {
    body: { reg_number: regNumber.trim() },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data.message as string
}

export async function resetStudentPasswordWithOtp(
  regNumber: string,
  otp: string,
  newPassword: string,
) {
  const { data, error } = await supabase.functions.invoke('student-reset-password', {
    body: {
      reg_number: regNumber.trim(),
      otp: otp.trim(),
      new_password: newPassword,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function markPasswordChanged(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ password_changed: true })
    .eq('id', userId)

  if (error) throw error
}
