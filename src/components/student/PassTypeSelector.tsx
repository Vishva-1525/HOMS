import { Moon, MoonStar, Sun } from 'lucide-react'
import type { PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

const PASS_OPTIONS: {
  type: PassType
  label: string
  description: string
  icon: typeof Sun
}[] = [
  {
    type: 'outpass',
    label: 'Outpass',
    description: 'Day trip — return same day',
    icon: Sun,
  },
  {
    type: 'staypass',
    label: 'Staypass',
    description: 'Overnight — return in 1–2 days',
    icon: Moon,
  },
  {
    type: 'night_pass',
    label: 'Night Pass',
    description: 'Extended leave — up to 78 hours',
    icon: MoonStar,
  },
]

interface PassTypeSelectorProps {
  value: PassType | null
  onChange: (type: PassType) => void
  error?: string
  disabled?: boolean
}

export function PassTypeSelector({ value, onChange, error, disabled }: PassTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                'flex flex-col items-center rounded-xl border-2 p-4 text-center transition-colors',
                isSelected
                  ? 'border-[#1A5CA0] bg-[#EBF3FF]/90'
                  : 'border-white/55 bg-white/55 hover:border-[#1A5CA0]/40 hover:bg-white/70',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <Icon
                className={cn('h-8 w-8', isSelected ? 'text-[#0D3F72]' : 'text-slate-600')}
                strokeWidth={1.5}
              />
              <p className="mt-2 text-sm font-semibold text-slate-900">{option.label}</p>
              <p className="mt-1 text-xs text-slate-600">{option.description}</p>
            </button>
          )
        })}
      </div>
      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
    </div>
  )
}
