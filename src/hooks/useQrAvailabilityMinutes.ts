import { supabase } from '@/lib/supabase'
import {
  DEFAULT_QR_AVAILABILITY_MINUTES,
  parseQrAvailabilityMinutes,
} from '@/lib/qr-availability'

let cachedMinutes: number | null = null
let cacheExpiry = 0

export async function fetchQrAvailabilityMinutes(): Promise<number> {
  const now = Date.now()
  if (cachedMinutes !== null && now < cacheExpiry) return cachedMinutes

  const { data, error } = await supabase.rpc('get_student_pass_limits')

  if (error || !data) {
    return DEFAULT_QR_AVAILABILITY_MINUTES
  }

  const settings = data as Record<string, string>
  cachedMinutes = parseQrAvailabilityMinutes(settings.qr_availability_minutes)
  cacheExpiry = now + 60_000
  return cachedMinutes
}

export function invalidateQrAvailabilityCache(): void {
  cachedMinutes = null
  cacheExpiry = 0
}
