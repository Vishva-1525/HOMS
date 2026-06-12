export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) return false
  if (url.includes('your-project') || key === 'your-anon-key') return false

  return true
}
