import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { StudentDataProvider } from '@/contexts/StudentDataContext'
import { WardenDataProvider } from '@/contexts/WardenDataContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { RoutePrefetch } from '@/components/auth/RoutePrefetch'
import { SafeRouteFallback } from '@/components/auth/SafeRouteFallback'
import { PageLoadFallback } from '@/components/layout/SuspenseOutlet'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { PwaBootstrap } from '@/components/pwa/PwaBootstrap'
import { Login } from '@/pages/Login'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { lazyWithRetry } from '@/lib/lazy-retry'

function lazyPage<T extends Record<string, unknown>>(
  importer: () => Promise<T>,
  exportName: keyof T,
) {
  return lazy(() =>
    lazyWithRetry(async () => {
      const mod = await importer()
      return { default: mod[exportName] as ComponentType<any> }
    }),
  )
}

/* Role shells — split so student clients never download admin/warden page graphs */
const StudentShell = lazyPage(() => import('@/components/layout/StudentShell'), 'StudentShell')
const WardenShell = lazyPage(() => import('@/components/layout/WardenShell'), 'WardenShell')
const SecurityShell = lazyPage(() => import('@/components/layout/SecurityShell'), 'SecurityShell')
const ParentShell = lazyPage(() => import('@/components/layout/ParentShell'), 'ParentShell')
const AppShell = lazyPage(() => import('@/components/layout/AppShell'), 'AppShell')

/* Pages */
const StudentHomePage = lazyPage(() => import('@/pages/student/StudentHomePage'), 'StudentHomePage')
const StudentNewRequestPage = lazyPage(
  () => import('@/pages/student/StudentNewRequestPage'),
  'StudentNewRequestPage',
)
const StudentPassesPage = lazyPage(
  () => import('@/pages/student/StudentPassesPage'),
  'StudentPassesPage',
)
const StudentProfilePage = lazyPage(
  () => import('@/pages/student/StudentProfilePage'),
  'StudentProfilePage',
)
const ExtensionRequestsPage = lazyPage(
  () => import('@/pages/warden/ExtensionRequestsPage'),
  'ExtensionRequestsPage',
)
const PendingRequestsPage = lazyPage(
  () => import('@/pages/warden/PendingRequestsPage'),
  'PendingRequestsPage',
)
const StudentsOutPage = lazyPage(() => import('@/pages/warden/StudentsOutPage'), 'StudentsOutPage')
const WardenHomePage = lazyPage(() => import('@/pages/warden/WardenHomePage'), 'WardenHomePage')
const ReportsPage = lazyPage(() => import('@/pages/warden/ReportsPage'), 'ReportsPage')
const SecurityScanPage = lazyPage(
  () => import('@/pages/security/SecurityScanPage'),
  'SecurityScanPage',
)
const ParentDashboard = lazyPage(() => import('@/pages/parent/ParentDashboard'), 'ParentDashboard')
const ParentHistoryPage = lazyPage(
  () => import('@/pages/parent/ParentHistoryPage'),
  'ParentHistoryPage',
)
const AdminDashboard = lazyPage(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard')
const AdminStudentsPage = lazyPage(
  () => import('@/pages/admin/AdminStudentsPage'),
  'AdminStudentsPage',
)
const AdminStaffPage = lazyPage(() => import('@/pages/admin/AdminStaffPage'), 'AdminStaffPage')
const AdminPassesPage = lazyPage(() => import('@/pages/admin/AdminPassesPage'), 'AdminPassesPage')
const AdminSettingsPage = lazyPage(
  () => import('@/pages/admin/AdminSettingsPage'),
  'AdminSettingsPage',
)
const AdminReportsPage = lazyPage(
  () => import('@/pages/admin/AdminReportsPage'),
  'AdminReportsPage',
)
const AdminCalendarPage = lazyPage(
  () => import('@/pages/admin/AdminCalendarPage'),
  'AdminCalendarPage',
)
const NotificationsPage = lazyPage(
  () => import('@/pages/shared/NotificationsPage'),
  'NotificationsPage',
)
const ComponentGalleryPage = lazyPage(
  () => import('@/pages/dev/ComponentGalleryPage'),
  'ComponentGalleryPage',
)

function RouteFallback({ label }: { label: string }) {
  return <PageLoadFallback label={label} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <PwaBootstrap />
          <InstallPrompt />
          <RoutePrefetch />
          <Suspense fallback={<RouteFallback label="Loading…" />}>
            <Routes>
              <Route path="/dev/ui" element={<ComponentGalleryPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/" element={<RoleRedirect />} />

              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route
                  element={
                    <StudentDataProvider>
                      <StudentShell />
                    </StudentDataProvider>
                  }
                >
                  <Route path="/student/dashboard" element={<StudentHomePage />} />
                  <Route path="/student/new-request" element={<StudentNewRequestPage />} />
                  <Route path="/student/passes" element={<StudentPassesPage />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                  <Route path="/student/notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['warden']} />}>
                <Route
                  element={
                    <WardenDataProvider>
                      <WardenShell />
                    </WardenDataProvider>
                  }
                >
                  <Route path="/warden/dashboard" element={<WardenHomePage />} />
                  <Route path="/warden/pending" element={<PendingRequestsPage />} />
                  <Route path="/warden/out" element={<StudentsOutPage />} />
                  <Route path="/warden/extensions" element={<ExtensionRequestsPage />} />
                  <Route path="/warden/reports" element={<ReportsPage />} />
                  <Route path="/warden/notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['security_guard']} />}>
                <Route element={<SecurityShell />}>
                  <Route path="/security/scan" element={<SecurityScanPage />} />
                  <Route path="/security/log" element={<SecurityScanPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route element={<ParentShell />}>
                  <Route path="/parent/dashboard" element={<ParentDashboard />} />
                  <Route path="/parent/history" element={<ParentHistoryPage />} />
                  <Route path="/parent/notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route element={<AppShell />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/students" element={<AdminStudentsPage />} />
                  <Route path="/admin/staff" element={<AdminStaffPage />} />
                  <Route path="/admin/passes" element={<AdminPassesPage />} />
                  <Route path="/admin/calendar" element={<AdminCalendarPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<SafeRouteFallback />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
