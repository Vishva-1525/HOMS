import { useState } from 'react'
import { AdminStaffDrawer } from '@/components/admin/AdminStaffDrawer'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStaff } from '@/hooks/admin/useAdminStaff'
import type { AdminStaffRow } from '@/lib/admin-types'
import { cn } from '@/lib/utils'

type StaffTab = 'warden' | 'security_guard'

export function AdminStaffPage() {
  const { wardens, guards, loading, error, createStaff } = useAdminStaff()
  const [tab, setTab] = useState<StaffTab>('warden')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const rows = tab === 'warden' ? wardens : guards

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading staff…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="dashboard-page-header mb-0">
          <h1 className="dashboard-heading text-xl md:text-2xl">Staff</h1>
          <p className="dashboard-subheading mt-1.5 text-sm">Manage wardens and security guards</p>
        </div>
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          {tab === 'warden' ? 'Add warden' : 'Add security guard'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <TabButton active={tab === 'warden'} onClick={() => setTab('warden')}>
          Wardens ({wardens.length})
        </TabButton>
        <TabButton active={tab === 'security_guard'} onClick={() => setTab('security_guard')}>
          Security Guards ({guards.length})
        </TabButton>
      </div>

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={rows}
          getRowKey={(row) => row.id}
          emptyMessage={`No ${tab === 'warden' ? 'wardens' : 'security guards'} found.`}
          columns={
            tab === 'warden'
              ? wardenColumns()
              : guardColumns()
          }
        />
      </div>

      <AdminStaffDrawer
        open={drawerOpen}
        role={tab}
        onClose={() => setDrawerOpen(false)}
        onSubmit={createStaff}
      />
    </div>
  )
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
        active ? 'bg-[#1A5CA0] text-white' : 'bg-white/60 text-slate-700 hover:bg-white/80',
      )}
    >
      {children}
    </button>
  )
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function wardenColumns() {
  return [
    { header: 'Name', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Block assigned',
      accessor: 'assignment_value' as const,
      render: (row: AdminStaffRow) => row.assignment_value || '—',
    },
    { header: 'Phone', accessor: 'phone' as const },
    {
      header: 'Status',
      accessor: 'id' as const,
      render: () => (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          Active
        </span>
      ),
    },
    {
      header: 'Last login',
      accessor: 'last_sign_in_at' as const,
      render: (row: AdminStaffRow) => formatLastLogin(row.last_sign_in_at),
    },
  ]
}

function guardColumns() {
  return [
    { header: 'Name', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Gate assigned',
      accessor: 'assignment_value' as const,
      render: (row: AdminStaffRow) => row.assignment_value || '—',
    },
    { header: 'Phone', accessor: 'phone' as const },
    {
      header: 'Status',
      accessor: 'id' as const,
      render: () => (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          Active
        </span>
      ),
    },
    {
      header: 'Scans today',
      accessor: 'scans_today' as const,
      render: (row: AdminStaffRow) => row.scans_today,
    },
    {
      header: 'Last login',
      accessor: 'last_sign_in_at' as const,
      render: (row: AdminStaffRow) => formatLastLogin(row.last_sign_in_at),
    },
  ]
}
