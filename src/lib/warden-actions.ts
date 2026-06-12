import { supabase } from '@/lib/supabase'
import type { OutpassWithStudent } from '@/lib/types'

export async function approveOutpassRequest(
  request: OutpassWithStudent,
  wardenId: string,
  remarks: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('outpass_requests')
    .update({
      status: 'approved',
      approved_by: wardenId,
      qr_code_data: crypto.randomUUID(),
      approved_at: new Date().toISOString(),
      warden_remark: remarks.trim() || null,
    })
    .eq('id', request.id)

  return { error: error?.message ?? null }
}

export async function rejectOutpassRequest(
  request: OutpassWithStudent,
  wardenId: string,
  remarks: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('outpass_requests')
    .update({
      status: 'rejected',
      approved_by: wardenId,
      warden_remark: remarks.trim(),
    })
    .eq('id', request.id)

  return { error: error?.message ?? null }
}
