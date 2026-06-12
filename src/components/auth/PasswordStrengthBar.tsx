import { getPasswordStrength } from '@/lib/password-strength'
import { cn } from '@/lib/utils'

interface PasswordStrengthBarProps {
  password: string
  className?: string
}

export function PasswordStrengthBar({ password, className }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password)
  const fillPercent = password ? Math.min(100, (strength.score / 5) * 100) : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--svce-border-default)]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPercent}%`, backgroundColor: strength.color }}
        />
      </div>
      {password && (
        <p className="text-xs font-medium" style={{ color: strength.color }}>
          {strength.label}
        </p>
      )}
    </div>
  )
}
