import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Home,
  Info,
  LogIn,
  LogOut,
  MapPin,
} from 'lucide-react'
import type { ParentWard } from '@/lib/parent-data'
import type { ParentAlert, WardStatusSummary } from '@/lib/parent-alerts'
import { formatStudentRoomDisplay } from '@/lib/warden'
import { cn } from '@/lib/utils'

interface ParentWardHeaderProps {
  ward: ParentWard
  wards: ParentWard[]
  onSelectWard?: (wardId: string) => void
}

export function ParentWardHeader({ ward, wards, onSelectWard }: ParentWardHeaderProps) {
  const name = ward.profile?.full_name?.trim() || 'Your ward'

  return (
    <div className="glass-panel-strong p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="dashboard-muted text-xs font-medium uppercase tracking-wide">Your ward</p>
          <h2 className="dashboard-heading mt-1 text-xl font-semibold">{name}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
            {ward.admissionNo && (
              <span className="font-mono font-medium">{ward.admissionNo}</span>
            )}
            <span>Reg: {ward.student.reg_number}</span>
            <span>{formatStudentRoomDisplay({
              reg_number: ward.student.reg_number,
              room_number: ward.student.room_number,
              hostel_block: ward.student.hostel_block,
              profiles: ward.profile ? { full_name: ward.profile.full_name } : null,
            })}</span>
            <span>{ward.student.department} · Year {ward.student.year_of_study}</span>
          </div>
        </div>

        {wards.length > 1 && onSelectWard && (
          <select
            value={ward.student.id}
            onChange={(e) => onSelectWard(e.target.value)}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-900"
          >
            {wards.map((w) => (
              <option key={w.student.id} value={w.student.id}>
                {w.profile?.full_name?.trim() || w.student.reg_number}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

const STATUS_STYLES = {
  outside: 'border-[#1A5CA0]/40 bg-[#1A5CA0]/10 text-[#1A5CA0]',
  in_hostel: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
  overdue: 'border-red-300/60 bg-red-50 text-red-800',
  no_active_pass: 'border-slate-300/60 bg-slate-50 text-slate-700',
} as const

const STATUS_ICONS = {
  outside: LogOut,
  in_hostel: Home,
  overdue: AlertTriangle,
  no_active_pass: MapPin,
} as const

export function ParentStatusBanner({ status }: { status: WardStatusSummary }) {
  const Icon = STATUS_ICONS[status.campusStatus]
  const style = STATUS_STYLES[status.campusStatus]

  return (
    <div className={cn('rounded-xl border px-4 py-4 sm:px-5', style)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <div>
          <p className="font-semibold">{status.label}</p>
          <p className="mt-1 text-sm opacity-90">{status.detail}</p>
        </div>
      </div>
    </div>
  )
}

const ALERT_STYLES = {
  info: 'border-blue-200/80 bg-blue-50/80',
  success: 'border-emerald-200/80 bg-emerald-50/80',
  warning: 'border-amber-200/80 bg-amber-50/80',
  danger: 'border-red-200/80 bg-red-50/80',
} as const

const ALERT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: Bell,
} as const

export function ParentAlertsList({ alerts }: { alerts: ParentAlert[] }) {
  return (
    <div className="dashboard-surface overflow-hidden">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <h2 className="dashboard-heading text-sm">Notifications &amp; activity</h2>
        <p className="dashboard-muted mt-0.5 text-xs">
          Pass updates, gate exit/entry, extensions, and overdue alerts
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="dashboard-muted px-4 py-10 text-center text-sm sm:px-5">
          No activity yet. Updates will appear when your ward requests or uses a pass.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200/60">
          {alerts.map((alert) => {
            const Icon = ALERT_ICONS[alert.tone]
            return (
              <li
                key={alert.id}
                className={cn('flex gap-3 px-4 py-3.5 sm:px-5', ALERT_STYLES[alert.tone])}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <time className="shrink-0 text-xs text-slate-500">
                      {formatAlertTime(alert.at)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">{alert.message}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function formatAlertTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export { LogIn, LogOut }
