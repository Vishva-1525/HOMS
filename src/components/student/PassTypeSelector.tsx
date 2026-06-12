import type { PassType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { FieldError } from '@/components/ui/field-error'

const PASS_OPTIONS: {
  type: PassType
  label: string
  description: string
}[] = [
  {
    type: 'outpass',
    label: 'Outpass',
    description: 'Day trip, return same day',
  },
  {
    type: 'staypass',
    label: 'Staypass',
    description: 'Overnight, return next day',
  },
  {
    type: 'night_pass',
    label: 'Night Pass',
    description: 'Up to 78 hours',
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
      <p className="text-sm font-medium">Pass Type</p>
      <div className="grid gap-3">
        {PASS_OPTIONS.map((option) => {
          const isSelected = value === option.type
          return (
            <button
              key={option.type}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.type)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/40',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <p className={cn('font-semibold', isSelected && 'text-primary')}>
                {option.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
            </button>
          )
        })}
      </div>
      <FieldError message={error} />
    </div>
  )
}
