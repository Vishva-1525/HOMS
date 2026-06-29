import { approveOutpassRequest, rejectOutpassRequest } from '@/lib/warden-actions'
import type { OutpassWithStudent } from '@/lib/types'

export interface BulkApprovalResult {
  succeeded: number
  failed: number
  errors: string[]
}

export async function bulkApproveOutpassRequests(
  requests: OutpassWithStudent[],
  actorId: string,
  remarks = '',
): Promise<BulkApprovalResult> {
  const errors: string[] = []
  let succeeded = 0

  for (const request of requests) {
    const { error } = await approveOutpassRequest(request, actorId, remarks)
    if (error) errors.push(`${request.id}: ${error}`)
    else succeeded += 1
  }

  return { succeeded, failed: requests.length - succeeded, errors }
}

export async function bulkRejectOutpassRequests(
  requests: OutpassWithStudent[],
  actorId: string,
  remarks: string,
): Promise<BulkApprovalResult> {
  const errors: string[] = []
  let succeeded = 0

  for (const request of requests) {
    const { error } = await rejectOutpassRequest(request, actorId, remarks)
    if (error) errors.push(`${request.id}: ${error}`)
    else succeeded += 1
  }

  return { succeeded, failed: requests.length - succeeded, errors }
}
