import { useState } from 'react'
import { Copy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'

interface AdminStaffDrawerProps {
  open: boolean
  role: 'warden' | 'security_guard'
  onClose: () => void
  onSubmit: (data: {
    full_name: string
    email: string
    phone: string
    role: 'warden' | 'security_guard'
    assignment_value: string
  }) => Promise<{ email: string; password: string }>
}

export function AdminStaffDrawer({ open, role, onClose, onSubmit }: AdminStaffDrawerProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [assignment, setAssignment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)

  if (!open) return null

  const title = role === 'warden' ? 'Add warden' : 'Add security guard'
  const assignmentLabel = role === 'warden' ? 'Block assigned' : 'Gate assigned'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await onSubmit({
        full_name: fullName,
        email,
        phone,
        role,
        assignment_value: assignment,
      })
      setCredentials(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setFullName('')
    setEmail('')
    setPhone('')
    setAssignment('')
    setCredentials(null)
    setError(null)
    onClose()
  }

  if (credentials) {
    return (
      <Modal open title="Account created" onClose={handleClose}>
        <p className="text-sm text-slate-700">
          Share these credentials with the staff member. The password is shown only once.
        </p>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 font-mono text-sm">
          <p>
            <span className="text-slate-500">Email: </span>
            {credentials.email}
          </p>
          <p>
            <span className="text-slate-500">Password: </span>
            {credentials.password}
          </p>
        </div>
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={() => navigator.clipboard.writeText(credentials.password)}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy password
        </Button>
      </Modal>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={handleClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[400px] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="staff-phone">Phone</Label>
              <Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="staff-assignment">{assignmentLabel}</Label>
              <Input id="staff-assignment" value={assignment} onChange={(e) => setAssignment(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
          <div className="border-t p-4">
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}
