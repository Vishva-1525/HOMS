import { Briefcase, Moon, Sun } from 'lucide-react'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { PassType } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PASS_OPTIONS: {
  type: Exclude<PassType, 'night_pass'>
  icon: typeof Sun
}[] = [
  {
    type: 'outpass',
    icon: Sun,
  },
  {
    type: 'staypass',
    icon: Moon,
  },
  {
    type: 'special_pass',
    icon: Briefcase,
  },
]

interface PassTypeSelectorProps {
  value: PassType | null
  onChange: (type: PassType) => void
  error?: string
  disabled?: boolean
}

export function PassTypeSelector({ value, onChange, error, disabled }: PassTypeSelectorProps) {
  const selected = PASS_OPTIONS.find((o) => o.type === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="pass-type">Pass type</Label>
      <select
        id="pass-type"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PassType)}
        className="flex h-10 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">Select pass type…</option>
        {PASS_OPTIONS.map((option) => (
          <option key={option.type} value={option.type}>
            {PASS_TYPE_LABELS[option.type]}
          </option>
        ))}
      </select>

      {selected && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-muted)] px-3 py-2.5">
          <selected.icon className="h-5 w-5 shrink-0 text-[#0D3F72]" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-900">{PASS_TYPE_LABELS[selected.type]}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PASS_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.type
          return (
            <button
              key={option.type}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.type)}
              className={cn(
                'flex flex-col items-center rounded-lg border p-3 text-center transition-colors',
                isSelected
                  ? 'border-[#1A5CA0] bg-[#EBF3FF]/90'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg-muted)] hover:border-[#1A5CA0]/40 hover:bg-[var(--glass-bg)]',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <Icon
                className={cn('h-5 w-5', isSelected ? 'text-[#0D3F72]' : 'text-slate-600')}
                strokeWidth={1.5}
              />
              <p className="mt-1.5 text-[11px] font-semibold text-slate-900">
                {PASS_TYPE_LABELS[option.type]}
              </p>
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
    </div>
  )
}
