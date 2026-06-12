import { useState } from 'react'
import { IconBuildingCommunity } from '@tabler/icons-react'
import {
  StudentBottomNav,
  type StudentTab,
} from '@/components/student/StudentBottomNav'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { HomeTab } from '@/pages/student/tabs/HomeTab'
import { MyPassesTab } from '@/pages/student/tabs/MyPassesTab'
import { NewRequestTab } from '@/pages/student/tabs/NewRequestTab'
import { ProfileTab } from '@/pages/student/tabs/ProfileTab'

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<StudentTab>('home')
  const dashboardData = useStudentDashboardData()

  return (
    <DashboardBackground>
      <div className="mx-auto min-h-screen max-w-lg">
        <header className="glass-nav sticky top-0 z-40 border-b px-4 py-3.5">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-white/50">
              <IconBuildingCommunity className="h-4 w-4" stroke={1.75} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                SVCE Hostel
              </p>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Outpass System
              </p>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 pb-28">
          {activeTab === 'home' && <HomeTab {...dashboardData} />}
          {activeTab === 'new-request' && <NewRequestTab onTabChange={setActiveTab} />}
          {activeTab === 'my-passes' && <MyPassesTab />}
          {activeTab === 'profile' && <ProfileTab />}
        </main>

        <StudentBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </DashboardBackground>
  )
}
