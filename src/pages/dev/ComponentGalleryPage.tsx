import { useState, type ReactNode } from 'react'
import {
  CheckCircle,
  Clock,
  FileText,
  Inbox,
  Plus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface SampleRow {
  id: string
  student: string
  type: string
  status: string
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: '1', student: '21CS001', type: 'Outpass', status: 'Pending' },
  { id: '2', student: '21CS014', type: 'Staypass', status: 'Approved' },
  { id: '3', student: '21ME007', type: 'Night Pass', status: 'Rejected' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--svce-border-default)] bg-[var(--svce-white)] p-6">
      <h2 className="mb-4 text-base font-semibold text-[var(--svce-text-primary)]">{title}</h2>
      {children}
    </section>
  )
}

export function ComponentGalleryPage() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmVariant, setConfirmVariant] = useState<'default' | 'danger'>('default')
  const [tableMode, setTableMode] = useState<'data' | 'loading' | 'empty'>('data')

  return (
    <div className="min-h-screen bg-[var(--svce-page-bg)]">
      <div className="border-b border-[var(--svce-border-default)] bg-[var(--svce-white)] px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--svce-primary-blue)]">
          HOMS Design System
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--svce-text-primary)]">
          Component Gallery
        </h1>
        <p className="mt-1 text-sm text-[var(--svce-text-secondary)]">
          SVCE-themed UI primitives — dev preview at <code>/dev/ui</code>
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <Section title="PageHeader">
          <PageHeader
            title="Pending Requests"
            subtitle="Review and approve student outpass requests"
            actions={
              <>
                <Button variant="secondary" size="sm">
                  Export
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </>
            }
          />
        </Section>

        <Section title="StatCard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Passes" value={128} icon={FileText} subtext="This semester" />
            <StatCard
              label="Approved"
              value={94}
              icon={CheckCircle}
              trend={{ value: '+12%', direction: 'up' }}
            />
            <StatCard
              label="Pending"
              value={18}
              icon={Clock}
              trend={{ value: '-3%', direction: 'down' }}
            />
            <StatCard label="Students" value={342} icon={Users} />
          </div>
        </Section>

        <Section title="Button">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button loading>Loading</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </Section>

        <Section title="StatusBadge">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="pending" />
            <StatusBadge status="approved" />
            <StatusBadge status="rejected" />
            <StatusBadge status="overdue" />
            <StatusBadge status="completed" />
            <StatusBadge status="cancelled" />
          </div>
        </Section>

        <Section title="PassTypeBadge">
          <div className="flex flex-wrap gap-2">
            <PassTypeBadge type="outpass" />
            <PassTypeBadge type="staypass" />
            <PassTypeBadge type="night_pass" />
          </div>
        </Section>

        <Section title="Skeleton">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Section>

        <Section title="EmptyState">
          <EmptyState
            icon={Inbox}
            title="No passes yet"
            description="When students submit requests, they will appear here."
            action={<Button size="sm">Create request</Button>}
          />
        </Section>

        <Section title="DataTable">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={tableMode === 'data' ? 'primary' : 'secondary'}
              onClick={() => setTableMode('data')}
            >
              With data
            </Button>
            <Button
              size="sm"
              variant={tableMode === 'loading' ? 'primary' : 'secondary'}
              onClick={() => setTableMode('loading')}
            >
              Loading
            </Button>
            <Button
              size="sm"
              variant={tableMode === 'empty' ? 'primary' : 'secondary'}
              onClick={() => setTableMode('empty')}
            >
              Empty
            </Button>
          </div>
          <DataTable
            columns={[
              { header: 'Student', accessor: 'student', skeletonClassName: 'w-20' },
              { header: 'Type', accessor: 'type', skeletonClassName: 'w-24' },
              {
                header: 'Status',
                accessor: 'status',
                skeletonClassName: 'w-16',
                render: (row) => (
                  <StatusBadge status="pending" label={String(row.status)} />
                ),
              },
            ]}
            data={tableMode === 'data' ? SAMPLE_ROWS : []}
            loading={tableMode === 'loading'}
            emptyMessage="No requests found for the selected filters."
            getRowKey={(row) => row.id}
          />
        </Section>

        <Section title="ConfirmModal">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmVariant('default')
                setConfirmOpen(true)
              }}
            >
              Open default modal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmVariant('danger')
                setConfirmOpen(true)
              }}
            >
              Open danger modal
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={confirmVariant === 'danger' ? 'Reject request?' : 'Approve request?'}
        description={
          confirmVariant === 'danger'
            ? 'This action cannot be undone. The student will be notified.'
            : 'The student will receive an approval notification with their QR pass.'
        }
        variant={confirmVariant}
        confirmLabel={confirmVariant === 'danger' ? 'Reject' : 'Approve'}
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
