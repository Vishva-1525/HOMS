import { User } from 'lucide-react'
import { UserAvatar, getInitials } from '@/components/layout/UserAvatar'
import { cn } from '@/lib/utils'

export type StudentAvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<StudentAvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-16 w-16 text-lg',
}

const ICON_SIZES: Record<StudentAvatarSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
}

export interface StudentAvatarProps {
  name: string
  /** When profile photos are added, pass the URL here — UI stays the same. */
  photoUrl?: string | null
  size?: StudentAvatarSize
  className?: string
}

/**
 * Consistent student profile placeholder across dashboards.
 * Replace `photoUrl` when real photos are available — no layout changes needed.
 */
export function StudentAvatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: StudentAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]
  const displayName = name.trim() || 'Student'
  const initials = getInitials(displayName)

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn(
          'shrink-0 rounded-full border-2 border-white/80 object-cover shadow-sm ring-2 ring-[#1A5CA0]/20',
          sizeClass,
          className,
        )}
      />
    )
  }

  if (initials.length >= 2) {
    return (
      <UserAvatar
        name={displayName}
        className={cn(
          'border-2 border-white/80 shadow-sm ring-2 ring-[#1A5CA0]/15',
          sizeClass,
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-gradient-to-br from-[#1A5CA0] to-[#0D3F72] text-white shadow-sm ring-2 ring-[#1A5CA0]/15',
        sizeClass,
        className,
      )}
      aria-hidden
    >
      <User className={ICON_SIZES[size]} strokeWidth={2} />
    </div>
  )
}
