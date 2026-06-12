import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { LOGIN_PATH } from '@/lib/routes'

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export function AuthLayout({
  children,
  title = 'SVCE Hostel Outpass System',
  description = 'Sri Venkateswara College of Engineering',
}: AuthLayoutProps) {
  return (
    <AuthBackground>
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6">
        <div className="glass-panel-strong w-full max-w-md p-8 sm:p-9">
          <div className="flex flex-col items-center text-center">
            <SvceEmblem size="lg" withRing />
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-sm">
            <Link to={LOGIN_PATH} className="font-medium text-[#1A5CA0] underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthBackground>
  )
}
