import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { WardenLayout } from '@/layouts/WardenLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { StudentDashboard } from '@/pages/student/StudentDashboard'
import { ExtensionRequestsPage } from '@/pages/warden/ExtensionRequestsPage'
import { PendingRequestsPage } from '@/pages/warden/PendingRequestsPage'
import { StudentsOutPage } from '@/pages/warden/StudentsOutPage'
import { WardenHomePage } from '@/pages/warden/WardenHomePage'
import { ReportsPage } from '@/pages/warden/ReportsPage'
import { WardenPlaceholderPage } from '@/pages/warden/WardenPlaceholderPage'
import { SecurityScan } from '@/pages/security/SecurityScan'
import { ParentDashboard } from '@/pages/parent/ParentDashboard'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['warden']} />}>
            <Route element={<WardenLayout />}>
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
              <Route
                path="/warden/settings"
                element={
                  <WardenPlaceholderPage
                    title="Settings"
                    description="Warden account settings coming soon."
                  />
                }
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['security_guard']} />}>
            <Route path="/security/scan" element={<SecurityScan />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
