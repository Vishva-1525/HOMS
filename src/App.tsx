import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AppShell } from '@/components/layout/AppShell'
import { SecurityShell } from '@/components/layout/SecurityShell'
import { ShellPagePlaceholder } from '@/components/layout/ShellPagePlaceholder'
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
import { WardenPlaceholderPage } from '@/pages/warden/WardenPlaceholderPage'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'

const SecurityScanPage = lazy(() =>
  import('@/pages/security/SecurityScanPage').then((m) => ({ default: m.SecurityScanPage })),
)
import { ParentDashboard } from '@/pages/parent/ParentDashboard'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { ComponentGalleryPage } from '@/pages/dev/ComponentGalleryPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/dev/ui" element={<ComponentGalleryPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppShell />}>
              <Route path="/student/dashboard" element={<StudentHomePage />} />
              <Route path="/student/new-request" element={<StudentNewRequestPage />} />
              <Route path="/student/passes" element={<StudentPassesPage />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
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
              <Route
                path="/warden/notifications"
                element={
                  <WardenPlaceholderPage
                    title="Notifications"
                    description="Notification preferences and history coming soon."
                  />
                }
              />
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
            <Route element={<AppShell />}>
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route
                path="/parent/history"
                element={
                  <ShellPagePlaceholder
                    title="Pass History"
                    description="Your ward's outpass history will appear here."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route
                path="/admin/students"
                element={
                  <ShellPagePlaceholder
                    title="Students"
                    description="Student management coming soon."
                  />
                }
              />
              <Route
                path="/admin/staff"
                element={
                  <ShellPagePlaceholder
                    title="Staff"
                    description="Staff management coming soon."
                  />
                }
              />
              <Route
                path="/admin/passes"
                element={
                  <ShellPagePlaceholder
                    title="All Passes"
                    description="View and manage all outpass requests."
                  />
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ShellPagePlaceholder
                    title="Reports"
                    description="Administrative reports coming soon."
                  />
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ShellPagePlaceholder
                    title="Settings"
                    description="System settings coming soon."
                  />
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
