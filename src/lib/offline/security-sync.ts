import { isTransientNetworkError } from '@/lib/network-error'
import { supabase } from '@/lib/supabase'
import {
  getPendingOutboxItems,
  removeOutboxItem,
  updateOutboxItem,
  type SecurityScanOutboxItem,
} from '@/lib/offline/security-db'
import { prefetchSecurityCache } from '@/lib/offline/security-prefetch'

export interface SecuritySyncResult {
  synced: number
  failed: number
  errors: string[]
}

export async function syncSecurityOutbox(): Promise<SecuritySyncResult> {
  const pending = await getPendingOutboxItems()
  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: [] }
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const item of pending) {
    const syncing: SecurityScanOutboxItem = { ...item, status: 'syncing' }
    await updateOutboxItem(syncing)

    const { error } = await supabase.rpc('record_gate_scan', {
      p_outpass_id: item.outpass_id,
      p_checkpoint: item.checkpoint,
    })

    if (error) {
      failed += 1
      const message = error.message
      errors.push(message)
      await updateOutboxItem({
        ...item,
        status: 'failed',
        error: message,
        retry_count: item.retry_count + 1,
      })
      continue
    }

    synced += 1
    await removeOutboxItem(item.client_id)
  }

  if (synced > 0) {
    try {
      await prefetchSecurityCache()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!isTransientNetworkError(err)) {
        errors.push(`Refresh after sync failed: ${message}`)
      }
    }
  }

  return { synced, failed, errors }
}
