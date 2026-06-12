import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/components/layout/nav'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  items: NavItem[]
  variant?: 'light' | 'dark'
}

export function BottomNav({ items, variant = 'light' }: BottomNavProps) {
  if (items.length === 0) return null

  const isDark = variant === 'dark'

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden',
        isDark ? 'border-t border-[#333] bg-[#1a1a1a]' : 'border-t border-[#E5E7EB] bg-white',
      )}
    >
      <div className="flex h-14 items-stretch">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  isActive
                    ? isDark
                      ? 'text-[#93C5FD]'
                      : 'text-[#1A5CA0]'
                    : isDark
                      ? 'text-[#6B7280]'
                      : 'text-[#9CA3AF]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className={cn(
                        'absolute inset-x-4 top-0 h-0.5 rounded-full',
                        isDark ? 'bg-[#93C5FD]' : 'bg-[#1A5CA0]',
                      )}
                    />
                  )}
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
