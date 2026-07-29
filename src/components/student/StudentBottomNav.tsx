import { IconClock, IconFilePlus, IconHome, IconUser } from '@tabler/icons-react'
import { useTheme } from '@/contexts/ThemeProvider'
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
  const { isDark } = useTheme()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
      <div
        className={cn(
          'mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border px-1 py-1 shadow-xl shadow-slate-900/15',
          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white',
        )}
      >
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
                  ? isDark
                    ? 'bg-[#1A5CA0] text-white shadow-md'
                    : 'bg-[#1A5CA0] text-white shadow-md shadow-[#1A5CA0]/25'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
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
