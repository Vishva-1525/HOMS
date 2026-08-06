#!/usr/bin/env node
/**
 * Generate Web Push VAPID keys and print setup steps for background notifications.
 *
 * Usage: npm run setup:web-push
 */
import { execSync } from 'node:child_process'

let output = ''
try {
  output = execSync('npx --yes web-push generate-vapid-keys', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (err) {
  console.error('Could not generate VAPID keys. Install Node.js and retry.')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

const publicMatch = output.match(/Public Key:\s*(\S+)/i)
const privateMatch = output.match(/Private Key:\s*(\S+)/i)
const publicKey = publicMatch?.[1]
const privateKey = privateMatch?.[1]

if (!publicKey || !privateKey) {
  console.error('Unexpected web-push output:\n', output)
  process.exit(1)
}

console.log(`
HOMS Web Push setup
===================

1) Frontend (.env / hosting env):
   VITE_VAPID_PUBLIC_KEY=${publicKey}

2) Supabase Edge Function secrets (Dashboard → Edge Functions → Secrets,
   or: npx supabase secrets set ...):
   VAPID_PUBLIC_KEY=${publicKey}
   VAPID_PRIVATE_KEY=${privateKey}
   VAPID_SUBJECT=mailto:hostel@svce.ac.in

3) Deploy the dispatcher:
   npx supabase functions deploy notification-dispatch

4) In Supabase SQL Editor, set dispatch settings (replace values):
   update public.system_settings
   set value = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'
   where key = 'supabase_functions_url';

   update public.system_settings
   set value = 'YOUR_SUPABASE_ANON_KEY'
   where key = 'supabase_anon_key';

5) Apply migration 041_reliable_push_dispatch.sql if not already applied.

6) On each phone: Install HOMS (Add to Home Screen on iOS) → Enable notifications.

Public and private keys must be from the SAME pair.
Keep VAPID_PRIVATE_KEY secret — never put it in the frontend.
`)
