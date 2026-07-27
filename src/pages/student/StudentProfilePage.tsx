import { useMemo, useState, type FormEvent } from 'react'
import { Building2, GraduationCap, Home, Mail, Phone, Shield } from 'lucide-react'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { Button } from '@/components/ui/button'
import { DashboardErrorPanel } from '@/components/ui/DashboardErrorPanel'
import { Input } from '@/components/ui/input'
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
  locked,
}: {
  icon: typeof Mail
  label: string
  value: string
  locked?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF]/80 ring-1 ring-[#1A5CA0]/15">
        <Icon className="h-4 w-4 text-[#0D3F72]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
          {locked ? ' · locked' : ''}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '').trim()
}

export function StudentProfilePage() {
  const { user, profile, changePassword, updatePhone, refreshProfile } = useAuth()
  const { student, loading, error, refetch } = useStudentDataContext()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const parentPhone = student?.parent_phone?.trim() ?? ''
  const currentPhone = profile?.phone?.trim() ?? ''

  const needsOwnPhone = useMemo(() => {
    if (!currentPhone) return true
    if (parentPhone && normalizePhone(currentPhone) === normalizePhone(parentPhone)) return true
    return false
  }, [currentPhone, parentPhone])

  const needsPassword = profile?.password_changed === false

  async function handleCompleteProfile(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const nextPhone = phone.trim() || (needsOwnPhone ? '' : currentPhone)
    if (needsOwnPhone && !nextPhone) {
      setFormError('Enter your personal phone number to complete your profile.')
      return
    }

    if (parentPhone && nextPhone && normalizePhone(nextPhone) === normalizePhone(parentPhone)) {
      setFormError('Use your own phone number — parent phone cannot be used here.')
      return
    }

    if (password || confirmPassword || needsPassword) {
      const strength = getPasswordStrength(password)
      if (strength.level === 'weak') {
        setFormError(
          'Choose a stronger password — at least 8 characters with mixed case and numbers.',
        )
        return
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (nextPhone && nextPhone !== currentPhone) {
        await updatePhone(nextPhone)
      }
      if (password) {
        await changePassword(password)
      }
      await refreshProfile()
      setPassword('')
      setConfirmPassword('')
      setPhone('')
      setFormSuccess('Profile updated successfully.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update profile.')
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

      {(needsOwnPhone || needsPassword) && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Complete your profile: add your personal phone number
          {needsPassword ? ' and set a new password' : ''}. Parent phone is managed by the hostel office
          and cannot be changed.
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-white/50 px-4 py-3">
          <h2 className="dashboard-heading text-sm font-semibold">Contact information</h2>
        </div>
        <div className="divide-y divide-white/50">
          <ProfileInfoRow icon={Mail} label="Email" value={email ?? '—'} />
          <ProfileInfoRow
            icon={Phone}
            label="Your phone"
            value={needsOwnPhone ? 'Not set yet' : currentPhone}
          />
          <ProfileInfoRow
            icon={Phone}
            label="Parent phone"
            value={parentPhone || '—'}
            locked
          />
          <ProfileInfoRow icon={Mail} label="Parent email" value={student?.parent_email || '—'} />
        </div>
      </div>

      {formSuccess && (
        <p className="rounded-xl bg-[#EBF7EE] px-4 py-3 text-sm text-[#166534]">{formSuccess}</p>
      )}

      <form onSubmit={handleCompleteProfile} className="glass-panel space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#0D3F72]" strokeWidth={1.75} />
          <h2 className="dashboard-heading text-sm font-semibold">Complete / update profile</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-phone">Your phone number</Label>
          <Input
            id="student-phone"
            type="tel"
            inputMode="tel"
            placeholder={needsOwnPhone ? 'Enter your personal mobile number' : currentPhone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
          <p className="text-xs text-slate-600">
            This is your number. Parent phone below is fixed and cannot be edited.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Parent phone (read-only)
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{parentPhone || '—'}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">
            {needsPassword ? 'Set a new password' : 'New password (optional)'}
          </Label>
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

        {formError && <p className="text-sm text-[#DC2626]">{formError}</p>}

        <Button type="submit" className="w-full" loading={submitting}>
          Save profile
        </Button>
      </form>
    </div>
  )
}
