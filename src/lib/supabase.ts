import { createClient } from '@supabase/supabase-js'
import { createResilientFetch } from '@/lib/resilient-fetch'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase credentials.',
  )
}

/** 1 retry, 8s timeout — fail soft on weak campus Wi‑Fi instead of hanging ~45s. */
const resilientFetch = createResilientFetch(1, 300, 8_000)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  global: {
    fetch: resilientFetch,
  },
})
