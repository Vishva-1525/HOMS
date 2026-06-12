import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'default' | 'outline' | 'link' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'default' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--svce-primary-blue)] text-white hover:bg-[var(--svce-dark-blue)] border border-transparent',
  default:
    'bg-[var(--svce-primary-blue)] text-white hover:bg-[var(--svce-dark-blue)] border border-transparent',
  secondary:
    'bg-[var(--svce-white)] border border-[var(--svce-primary-blue)] text-[var(--svce-primary-blue)] hover:bg-[var(--svce-blue-tint)]',
  outline:
    'bg-[var(--svce-white)] border border-[var(--svce-primary-blue)] text-[var(--svce-primary-blue)] hover:bg-[var(--svce-blue-tint)]',
  danger: 'bg-[var(--svce-danger)] text-white hover:bg-[#B91C1C] border border-transparent',
  destructive: 'bg-[var(--svce-danger)] text-white hover:bg-[#B91C1C] border border-transparent',
  ghost:
    'bg-transparent border border-transparent text-[var(--svce-text-secondary)] hover:bg-[var(--svce-page-bg)]',
  link: 'bg-transparent border border-transparent text-[var(--svce-primary-blue)] underline-offset-4 hover:underline p-0 h-auto',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  default: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-10 w-10 p-0',
}

function resolveVariant(variant: ButtonVariant): ButtonVariant {
  if (variant === 'default') return 'primary'
  if (variant === 'outline') return 'secondary'
  if (variant === 'destructive') return 'danger'
  return variant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const resolvedVariant = resolveVariant(variant)

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--svce-primary-blue)] focus-visible:outline-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[resolvedVariant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="sr-only">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
