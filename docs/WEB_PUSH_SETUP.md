# Background Web Push (app closed / phone locked)

HOMS uses **Web Push** so students, wardens, and parents get system notifications even when the app is closed.

## How it works

1. User enables notifications → browser creates a push subscription → saved in `push_subscriptions`.
2. An event (approve / new request / etc.) inserts into `notifications_log` → `notification_outbox`.
3. Edge function `notification-dispatch` sends Web Push via VAPID to the user’s devices.
4. Service worker (`src/sw.ts`) shows a system notification (works with screen locked).

In-app Realtime alerts still work when the tab is open; they are separate from background push.

## One-time setup

```bash
npm install -D web-push
node scripts/setup-web-push.mjs
```

Follow the printed steps:

| Where | Keys / values |
|-------|----------------|
| Frontend env | `VITE_VAPID_PUBLIC_KEY` |
| Edge Function secrets | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| `system_settings` | `supabase_functions_url`, `supabase_anon_key` |

Then:

```bash
npx supabase functions deploy notification-dispatch
npx supabase db push   # includes 041_reliable_push_dispatch.sql
```

## Device checklist

- **Android / desktop Chrome**: open HOMS → Enable notifications.
- **iPhone / iPad**: Share → Add to Home Screen → open from icon → Enable notifications.
- Confirm a row exists in `push_subscriptions` for that user.

## Verify

1. Enable push on a student phone, then fully close HOMS.
2. Approve a pass as warden.
3. Phone should show a system notification without opening the app.

If nothing arrives: check Edge Function logs for missing VAPID keys, empty subscriptions, or 401 from misconfigured `supabase_anon_key` / functions URL.
