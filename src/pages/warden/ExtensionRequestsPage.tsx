import { useEffect, useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { WardenExtensionDrawer } from '@/components/warden/WardenExtensionDrawer'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { formatReturnTime } from '@/lib/outpass'
import { formatRelativeTime } from '@/lib/relative-time'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import { supabase } from '@/lib/supabase'
import type { ExtensionWithOutpass } from '@/lib/types'

export function ExtensionRequestsPage() {
  const { refetch } = useWardenDataContext()
  const [extensions, setExtensions] = useState<ExtensionWithOutpass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<'approve' | 'reject' | null>(null)
  const [selectedExtension, setSelectedExtension] = useState<ExtensionWithOutpass | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  async function fetchExtensions() {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('extension_requests')
      .select(`
        *,
        outpass_requests (
          *,
          students (
            reg_number,
            room_number,
            hostel_block,
            profiles ( full_name )
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setExtensions((data ?? []) as ExtensionWithOutpass[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExtensions()

    const channel = supabase
      .channel('warden-extensions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => fetchExtensions(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function openDrawer(ext: ExtensionWithOutpass, mode: 'approve' | 'reject') {
    setSelectedExtension(ext)
    setDrawerMode(mode)
    setRemarks('')
    setActionError(null)
  }

  function closeDrawer() {
    if (submitting) return
    setDrawerMode(null)
    setSelectedExtension(null)
    setRemarks('')
    setActionError(null)
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!selectedExtension) return

    if (action === 'reject' && !remarks.trim()) {
      setActionError('Remarks are required when rejecting an extension.')
      return
    }

    setSubmitting(true)
    setActionError(null)

    if (action === 'approve') {
      const { error: extError } = await supabase
        .from('extension_requests')
        .update({ status: 'approved' })
        .eq('id', selectedExtension.id)

      if (!extError && selectedExtension.outpass_requests) {
        await supabase
          .from('outpass_requests')
          .update({
            return_by: selectedExtension.new_return_time,
            status: 'extended',
          })
          .eq('id', selectedExtension.outpass_id)
      }

      if (extError) {
        setActionError(extError.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error: extError } = await supabase
        .from('extension_requests')
        .update({ status: 'rejected' })
        .eq('id', selectedExtension.id)

      if (extError) {
        setActionError(extError.message)
        setSubmitting(false)
        return
      }
    }

    const id = selectedExtension.id
    setFadingIds((prev) => new Set(prev).add(id))
    setSubmitting(false)
    closeDrawer()

    window.setTimeout(() => {
      setFadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      fetchExtensions()
      refetch()
    }, 300)
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading extensions…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extension requests"
        subtitle={`${extensions.length} pending extension${extensions.length !== 1 ? 's' : ''}`}
      />

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="dashboard-surface">
        <DataTable
          columns={[
            {
              header: 'Student',
              accessor: 'id',
              render: (row) => getStudentName(row.outpass_requests?.students),
            },
            {
              header: 'Reg No',
              accessor: 'id',
              render: (row) => getStudentReg(row.outpass_requests?.students),
            },
            {
              header: 'Room',
              accessor: 'id',
              render: (row) => getStudentRoom(row.outpass_requests?.students),
            },
            {
              header: 'Current return',
              accessor: 'id',
              render: (row) =>
                row.outpass_requests
                  ? formatReturnTime(row.outpass_requests.return_by)
                  : '—',
            },
            {
              header: 'Requested return',
              accessor: 'new_return_time',
              render: (row) => (
                <span className="font-medium text-[#1A5CA0]">
                  {formatReturnTime(row.new_return_time)}
                </span>
              ),
            },
            { header: 'Reason', accessor: 'reason' },
            {
              header: 'Submitted',
              accessor: 'created_at',
              render: (row) => formatRelativeTime(row.created_at),
            },
            {
              header: 'Actions',
              accessor: 'id',
              render: (row) => (
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => openDrawer(row, 'approve')}>
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-[#DC2626] hover:bg-[#FEF2F2]"
                    onClick={() => openDrawer(row, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              ),
            },
          ]}
          data={extensions}
          emptyMessage="No pending extension requests."
          getRowKey={(row) => row.id}
          getRowClassName={(row) => (fadingIds.has(row.id) ? 'opacity-0' : undefined)}
        />
      </div>

      <WardenExtensionDrawer
        open={drawerMode !== null}
        mode={drawerMode ?? 'approve'}
        extension={selectedExtension}
        remarks={remarks}
        onRemarksChange={setRemarks}
        onClose={closeDrawer}
        onPrimaryAction={() => handleDecision(drawerMode ?? 'approve')}
        onSecondaryAction={() => {
          if (drawerMode === 'reject') closeDrawer()
          else setDrawerMode('reject')
        }}
        submitting={submitting}
        error={actionError}
      />
    </div>
  )
}
