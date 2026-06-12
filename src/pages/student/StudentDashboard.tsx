import { useState } from 'react'
import {
  StudentBottomNav,
  type StudentTab,
} from '@/components/student/StudentBottomNav'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { HomeTab } from '@/pages/student/tabs/HomeTab'
import { MyPassesTab } from '@/pages/student/tabs/MyPassesTab'
import { NewRequestTab } from '@/pages/student/tabs/NewRequestTab'
import { ProfileTab } from '@/pages/student/tabs/ProfileTab'

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<StudentTab>('home')
  const dashboardData = useStudentDashboardData()

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          SVCE Hostel Outpass
        </p>
      </header>

      <main className="px-4 py-5 pb-24">
        {activeTab === 'home' && <HomeTab {...dashboardData} />}
        {activeTab === 'new-request' && <NewRequestTab onTabChange={setActiveTab} />}
        {activeTab === 'my-passes' && <MyPassesTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      <StudentBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
