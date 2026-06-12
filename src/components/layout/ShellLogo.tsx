import { cn } from '@/lib/utils'

interface ShellLogoProps {
  collapsed?: boolean
  className?: string
}

export function ShellLogo({ collapsed = false, className }: ShellLogoProps) {
  if (collapsed) {
    return (
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md bg-white text-2xl font-bold text-[#1A5CA0]',
          className,
        )}
        aria-label="SVCE"
      >
        S
      </div>
    )
  }

  return (
    <img
      src="/svce-logo.png"
      alt="Sri Venkateswara College of Engineering"
      className={cn('h-9 w-auto object-contain', className)}
    />
  )
}
