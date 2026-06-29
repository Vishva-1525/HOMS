import { Briefcase, Moon, MoonStar, Sun } from 'lucide-react'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { PassType } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PASS_OPTIONS: {
  type: PassType
  description: string
  icon: typeof Sun
}[] = [
  {
    type: 'outpass',
    description: 'Day trip — return same day',
    icon: Sun,
  },
  {
    type: 'staypass',
    description: 'Overnight — return in 1–2 days',
    icon: Moon,
  },
  {
    type: 'night_pass',
    description: 'Extended leave — up to 78 hours',
    icon: MoonStar,
  },
  {
    type: 'special_pass',
    description: 'Internship, events, industrial visit',
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
        className="flex h-10 w-full rounded-xl border border-white/55 bg-white/50 px-3 text-sm text-slate-900 shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">Select pass type…</option>
        {PASS_OPTIONS.map((option) => (
          <option key={option.type} value={option.type}>
            {PASS_TYPE_LABELS[option.type]}
          </option>
        ))}
      </select>

      {selected && (
        <div className="flex items-center gap-3 rounded-xl border border-white/55 bg-white/45 px-3 py-2.5">
          <selected.icon className="h-5 w-5 shrink-0 text-[#0D3F72]" strokeWidth={1.5} />
          <p className="text-xs text-slate-600">{selected.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  : 'border-white/55 bg-white/40 hover:border-[#1A5CA0]/40 hover:bg-white/60',
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
