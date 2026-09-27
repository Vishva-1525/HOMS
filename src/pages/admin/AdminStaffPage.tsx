import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { AdminStaffDrawer } from '@/components/admin/AdminStaffDrawer'
import { AdminStaffEditDrawer } from '@/components/admin/AdminStaffEditDrawer'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useAdminStaff, type StaffRole } from '@/hooks/admin/useAdminStaff'
import type { AdminStaffRow } from '@/lib/admin-types'
import { formatBlockLabel } from '@/lib/block-display'
import { cn } from '@/lib/utils'

type StaffTab = StaffRole

const ADD_LABEL: Record<StaffTab, string> = {
  warden: 'Add warden',
  security_guard: 'Add security guard',
  admin: 'Add admin',
}

const EMPTY_LABEL: Record<StaffTab, string> = {
  warden: 'wardens',
  security_guard: 'security guards',
  admin: 'admins',
}

export function AdminStaffPage() {
  const { role: viewerRole } = useAuth()
  const isAdminViewer = viewerRole === 'admin'
  const { wardens, guards, admins, loading, error, createStaff, updateStaffAssignment, refetch } =
    useAdminStaff(isAdminViewer)
  const [tab, setTab] = useState<StaffTab>('warden')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editStaff, setEditStaff] = useState<AdminStaffRow | null>(null)

  const activeTab: StaffTab = tab === 'admin' && !isAdminViewer ? 'warden' : tab
  const rows = activeTab === 'warden' ? wardens : activeTab === 'security_guard' ? guards : admins

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading staff…" />
      </div>
    )
  }

  if (error && wardens.length === 0 && guards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="dashboard-page-header">
          <h1 className="dashboard-heading text-2xl md:text-3xl">Staff</h1>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              void refetch()
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="dashboard-page-header mb-0">
          <h1 className="dashboard-heading text-2xl md:text-3xl">Staff</h1>
        </div>
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          {ADD_LABEL[activeTab]}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <TabButton active={activeTab === 'warden'} onClick={() => setTab('warden')}>
          Wardens ({wardens.length})
        </TabButton>
        <TabButton active={activeTab === 'security_guard'} onClick={() => setTab('security_guard')}>
          Security Guards ({guards.length})
        </TabButton>
        {isAdminViewer && (
          <TabButton active={activeTab === 'admin'} onClick={() => setTab('admin')}>
            Admins ({admins.length})
          </TabButton>
        )}
      </div>

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={rows}
          getRowKey={(row) => row.id}
          emptyMessage={`No ${EMPTY_LABEL[activeTab]} found.`}
          columns={
            activeTab === 'warden'
              ? wardenColumns((row) => setEditStaff(row))
              : activeTab === 'security_guard'
                ? guardColumns((row) => setEditStaff(row))
                : adminColumns()
          }
        />
      </div>

      <AdminStaffDrawer
        open={drawerOpen}
        role={activeTab}
        onClose={() => setDrawerOpen(false)}
        onSubmit={createStaff}
      />

      {activeTab !== 'admin' && (
        <AdminStaffEditDrawer
          open={editStaff !== null}
          staff={editStaff}
          role={activeTab}
          onClose={() => setEditStaff(null)}
          onSave={(profileId, assignmentValue) =>
            updateStaffAssignment(profileId, activeTab, assignmentValue)
          }
        />
      )}
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
        active ? 'bg-[#1A5CA0] text-white' : 'border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-slate-900 shadow-sm hover:bg-white',
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

function EditAssignmentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#1A5CA0] transition-colors hover:bg-[#EBF3FF]"
      aria-label="Edit assignment"
      title="Edit assignment"
    >
      <Pencil className="h-4 w-4" strokeWidth={1.75} />
    </button>
  )
}

function wardenColumns(onEdit: (row: AdminStaffRow) => void) {
  return [
    { header: 'Name', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Block assigned',
      accessor: 'assignment_value' as const,
      render: (row: AdminStaffRow) =>
        row.assignment_value ? formatBlockLabel(row.assignment_value) : '-',
    },
    { header: 'Phone', accessor: 'phone' as const },
    {
      header: 'Status',
      accessor: 'status' as const,
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
    {
      header: '',
      accessor: 'actions' as const,
      width: '48px',
      render: (row: AdminStaffRow) => <EditAssignmentButton onClick={() => onEdit(row)} />,
    },
  ]
}

function adminColumns() {
  return [
    { header: 'Name', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Phone', accessor: 'phone' as const },
    {
      header: 'Last login',
      accessor: 'last_sign_in_at' as const,
      render: (row: AdminStaffRow) => formatLastLogin(row.last_sign_in_at),
    },
  ]
}

function guardColumns(onEdit: (row: AdminStaffRow) => void) {
  return [
    { header: 'Name', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Gate assigned',
      accessor: 'assignment_value' as const,
      render: (row: AdminStaffRow) => row.assignment_value || '-',
    },
    { header: 'Phone', accessor: 'phone' as const },
    {
      header: 'Status',
      accessor: 'status' as const,
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
    {
      header: '',
      accessor: 'actions' as const,
      width: '48px',
      render: (row: AdminStaffRow) => <EditAssignmentButton onClick={() => onEdit(row)} />,
    },
  ]
}
