import { IconClock, IconFilePlus, IconHome, IconUser } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export type StudentTab = 'home' | 'new-request' | 'my-passes' | 'profile'

const TABS: { id: StudentTab; label: string; icon: typeof IconHome }[] = [
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'new-request', label: 'New Request', icon: IconFilePlus },
  { id: 'my-passes', label: 'My Passes', icon: IconClock },
  { id: 'profile', label: 'Profile', icon: IconUser },
]

interface StudentBottomNavProps {
  activeTab: StudentTab
  onTabChange: (tab: StudentTab) => void
}

export function StudentBottomNav({ activeTab, onTabChange }: StudentBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} stroke={1.75} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
