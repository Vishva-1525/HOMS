import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AppShell } from '@/components/layout/AppShell'
import { SecurityShell } from '@/components/layout/SecurityShell'
import { WardenShell } from '@/components/layout/WardenShell'
import { WardenDataProvider } from '@/contexts/WardenDataContext'
import { Login } from '@/pages/Login'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { StudentHomePage } from '@/pages/student/StudentHomePage'
import { StudentNewRequestPage } from '@/pages/student/StudentNewRequestPage'
import { StudentPassesPage } from '@/pages/student/StudentPassesPage'
import { StudentProfilePage } from '@/pages/student/StudentProfilePage'
import { ExtensionRequestsPage } from '@/pages/warden/ExtensionRequestsPage'
import { PendingRequestsPage } from '@/pages/warden/PendingRequestsPage'
import { StudentsOutPage } from '@/pages/warden/StudentsOutPage'
import { WardenHomePage } from '@/pages/warden/WardenHomePage'
import { ReportsPage } from '@/pages/warden/ReportsPage'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { SafeRouteFallback } from '@/components/auth/SafeRouteFallback'

import { lazyWithRetry } from '@/lib/lazy-retry'

const SecurityScanPage = lazy(() =>
  lazyWithRetry(() =>
    import('@/pages/security/SecurityScanPage').then((m) => ({ default: m.SecurityScanPage })),
  ),
)
import { ParentDashboard } from '@/pages/parent/ParentDashboard'
import { ParentHistoryPage } from '@/pages/parent/ParentHistoryPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminStudentsPage } from '@/pages/admin/AdminStudentsPage'
import { AdminStaffPage } from '@/pages/admin/AdminStaffPage'
import { AdminPassesPage } from '@/pages/admin/AdminPassesPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { ComponentGalleryPage } from '@/pages/dev/ComponentGalleryPage'
import { StudentShell } from '@/components/layout/StudentShell'
import { ParentShell } from '@/components/layout/ParentShell'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { PwaBootstrap } from '@/components/pwa/PwaBootstrap'
import { NotificationsPage } from '@/pages/shared/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaBootstrap />
        <InstallPrompt />
        <Routes>
          <Route path="/dev/ui" element={<ComponentGalleryPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentShell />}>
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
              <Route
                path="/security/scan"
                element={
                  <Suspense fallback={<AuthLoadingScreen label="Loading gate scanner…" />}>
                    <SecurityScanPage />
                  </Suspense>
                }
              />
              <Route
                path="/security/log"
                element={
                  <Suspense fallback={<AuthLoadingScreen label="Loading gate scanner…" />}>
                    <SecurityScanPage />
                  </Suspense>
                }
              />
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
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route
                path="/admin/settings"
                element={<AdminSettingsPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<SafeRouteFallback />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
