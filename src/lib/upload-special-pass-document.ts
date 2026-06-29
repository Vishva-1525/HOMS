import { supabase } from '@/lib/supabase'
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/special-pass'

export async function uploadSpecialPassDocument(
  userId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { path: null, error: 'Only PDF and image files are allowed.' }
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { path: null, error: 'File must be 5 MB or smaller.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('special-pass-documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { path: null, error: error.message }
  }

  return { path, error: null }
}
