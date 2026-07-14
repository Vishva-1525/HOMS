import { useState, type FormEvent } from 'react'
import { Building2, GraduationCap, Home, Mail, Phone, Shield } from 'lucide-react'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { Button } from '@/components/ui/button'
import { DashboardErrorPanel } from '@/components/ui/DashboardErrorPanel'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useStudentDataContext } from '@/contexts/StudentDataContext'
import { formatBlockLabel } from '@/lib/block-display'
import { getPasswordStrength } from '@/lib/password-strength'

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF]/80 ring-1 ring-[#1A5CA0]/15">
        <Icon className="h-4 w-4 text-[#0D3F72]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

export function StudentProfilePage() {
  const { user, profile, changePassword } = useAuth()
  const { student, loading, error, refetch } = useStudentDataContext()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)

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

  if (error && !student && !profile) {
    return (
      <DashboardErrorPanel
        error={error}
        retrying={retrying}
        title="Couldn’t load your profile"
        onRetry={async () => {
          setRetrying(true)
          try {
            await refetch()
          } finally {
            setRetrying(false)
          }
        }}
      />
    )
  }

  const displayName = profile?.full_name ?? 'Student'
  const email = user?.email ?? null

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="glass-panel-strong overflow-hidden">
        <div className="bg-gradient-to-br from-[#0D3F72]/8 via-transparent to-[#1A5CA0]/5 px-6 pb-6 pt-8 text-center">
          <StudentAvatar name={displayName} size="xl" className="mx-auto" />
          <h1 className="dashboard-heading mt-4 text-xl font-semibold">{displayName}</h1>
          <p className="dashboard-subheading mt-1 text-sm font-medium">{student?.reg_number ?? '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/50 bg-white/40">
          <div className="flex flex-col items-center px-4 py-4 text-center">
            <Home className="mb-1.5 h-4 w-4 text-[#1A5CA0]" strokeWidth={1.75} />
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Room</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{student?.room_number ?? '—'}</p>
          </div>
          <div className="flex flex-col items-center px-4 py-4 text-center">
            <Building2 className="mb-1.5 h-4 w-4 text-[#1A5CA0]" strokeWidth={1.75} />
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Block</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {student?.hostel_block ? formatBlockLabel(student.hostel_block) : '—'}
            </p>
          </div>
          {student?.department && (
            <div className="col-span-2 flex flex-col items-center border-t border-white/50 px-4 py-4 text-center">
              <GraduationCap className="mb-1.5 h-4 w-4 text-[#1A5CA0]" strokeWidth={1.75} />
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Department</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {student.department} · Year {student.year_of_study}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-white/50 px-4 py-3">
          <h2 className="dashboard-heading text-sm font-semibold">Contact information</h2>
        </div>
        <div className="divide-y divide-white/50">
          <ProfileInfoRow icon={Mail} label="Email" value={email ?? '—'} />
          <ProfileInfoRow icon={Phone} label="Phone" value={profile?.phone ?? '—'} />
          <ProfileInfoRow icon={Phone} label="Parent phone" value={student?.parent_phone ?? '—'} />
          <ProfileInfoRow icon={Mail} label="Parent email" value={student?.parent_email ?? '—'} />
        </div>
      </div>

      {passwordSuccess && (
        <p className="rounded-xl bg-[#EBF7EE] px-4 py-3 text-sm text-[#166534]">
          Password updated successfully.
        </p>
      )}

      {!showPasswordForm ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          onClick={() => {
            setShowPasswordForm(true)
            setPasswordError(null)
          }}
        >
          <Shield className="h-4 w-4" strokeWidth={1.75} />
          Change password
        </Button>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="glass-panel space-y-4 p-5">
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

          {passwordError && <p className="text-sm text-[#DC2626]">{passwordError}</p>}

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
