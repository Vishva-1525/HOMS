import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function UserAvatar({ name, size = 'md', className }: UserAvatarProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-[#1A5CA0] font-semibold text-white',
        sizeClass,
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  )
}
