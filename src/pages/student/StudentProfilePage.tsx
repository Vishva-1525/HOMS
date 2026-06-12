import { useState, type FormEvent } from 'react'
import { Mail, Phone, UserRound } from 'lucide-react'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { getInitials } from '@/components/layout/UserAvatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useStudentProfile } from '@/hooks/useStudentProfile'
import { getPasswordStrength } from '@/lib/password-strength'

export function StudentProfilePage() {
  const { student, profile, email, loading, error, changePassword } = useStudentProfile()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    const strength = getPasswordStrength(password)
    if (strength.level === 'weak') {
      setPasswordError('Choose a stronger password — at least 8 characters with mixed case and numbers.')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword(password)
      setPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setShowPasswordForm(false)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading profile…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        {error}
      </div>
    )
  }

  const infoRows = [
    { icon: Mail, label: 'Email', value: email ?? '—' },
    { icon: Phone, label: 'Phone', value: profile?.phone ?? '—' },
    { icon: Phone, label: 'Parent phone', value: student?.parent_phone ?? '—' },
    { icon: Mail, label: 'Parent email', value: student?.parent_email ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="glass-panel-strong flex flex-col items-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF3FF] text-lg font-semibold text-[#0D3F72]">
          {profile?.full_name ? getInitials(profile.full_name) : <UserRound className="h-6 w-6" />}
        </div>
        <h1 className="dashboard-heading mt-3 text-lg font-semibold">{profile?.full_name ?? 'Student'}</h1>
        <p className="dashboard-subheading mt-1 text-sm">{student?.reg_number ?? '—'}</p>
        <p className="dashboard-subheading text-sm">
          Room {student?.room_number ?? '—'}
          {student?.hostel_block ? ` · ${student.hostel_block}` : ''}
        </p>
        {student?.department && (
          <p className="dashboard-subheading text-sm">
            {student.department} · Year {student.year_of_study}
          </p>
        )}
      </div>

      <div className="glass-panel divide-y divide-white/50">
        {infoRows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/55">
              <Icon className="h-4 w-4 text-[#0D3F72]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-600">{label}</p>
              <p className="truncate text-sm font-medium text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {passwordSuccess && (
        <p className="rounded-lg bg-[#EBF7EE] px-4 py-3 text-sm text-[#166534]">
          Password updated successfully.
        </p>
      )}

      {!showPasswordForm ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            setShowPasswordForm(true)
            setPasswordError(null)
          }}
        >
          Change password
        </Button>
      ) : (
        <form
          onSubmit={handlePasswordSubmit}
          className="glass-panel space-y-4 p-4"
        >
          <h2 className="dashboard-heading text-sm font-semibold">Change password</h2>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <PasswordStrengthBar password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm password</Label>
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {passwordError && (
            <p className="text-sm text-[#DC2626]">{passwordError}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setShowPasswordForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={submitting}>
              Update
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
