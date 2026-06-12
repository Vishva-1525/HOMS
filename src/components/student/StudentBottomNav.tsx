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
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
      <div className="glass-nav mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border px-1 py-1 shadow-xl shadow-slate-900/10">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:bg-white/40 hover:text-foreground',
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
