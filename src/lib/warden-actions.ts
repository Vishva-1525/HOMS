import { supabase } from '@/lib/supabase'
import { buildPassQrValue, generateEntryCode } from '@/lib/pass-qr'
import { flushNotificationOutbox } from '@/lib/push-notifications'
import type { OutpassWithStudent } from '@/lib/types'

export async function approveOutpassRequest(
  request: OutpassWithStudent,
  wardenId: string,
  remarks: string,
  options?: { skipNotificationFlush?: boolean },
): Promise<{ error: string | null }> {
  const entryCode = generateEntryCode()
  // Store the same short code the QR encodes so gate scan matches manual entry.
  const qrCodeData = buildPassQrValue({ ...request, entry_code: entryCode })

  const { error } = await supabase
    .from('outpass_requests')
    .update({
      status: 'approved',
      approved_by: wardenId,
      qr_code_data: qrCodeData,
      entry_code: entryCode,
      approved_at: new Date().toISOString(),
      warden_remark: remarks.trim() || null,
    })
    .eq('id', request.id)

  if (!error && !options?.skipNotificationFlush) {
    await flushNotificationOutbox()
  }

  return { error: error?.message ?? null }
}

export async function rejectOutpassRequest(
  request: OutpassWithStudent,
  wardenId: string,
  remarks: string,
  options?: { skipNotificationFlush?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('outpass_requests')
    .update({
      status: 'rejected',
      approved_by: wardenId,
      warden_remark: remarks.trim(),
    })
    .eq('id', request.id)

  if (!error && !options?.skipNotificationFlush) {
    await flushNotificationOutbox()
  }

  return { error: error?.message ?? null }
}
