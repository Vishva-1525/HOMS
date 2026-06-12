import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-md">
        <CardHeader className="items-center text-center">
          <div
            className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden
          >
            <Building2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
