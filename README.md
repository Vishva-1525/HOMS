# HOMS — Hostel Outpass Management System

A role-based web application for **Sri Venkateswara College of Engineering (SVCE)** to manage hostel outpass requests, gate scanning, and extensions.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Row Level Security)

## Roles

| Role | Dashboard route |
|------|-----------------|
| Student | `/student/dashboard` |
| Warden | `/warden/dashboard` |
| Security Guard | `/security/scan` |
| Parent | `/parent/dashboard` |
| Admin | `/admin/dashboard` |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and set your project URL and anon key.
3. Apply the database migrations (in order):

   **Option A — Supabase Dashboard:** Open the SQL Editor and run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_auth_enhancements.sql`

   **Option B — Supabase CLI:**

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   npx supabase functions deploy student-forgot-password
   npx supabase functions deploy student-reset-password
   ```

4. Configure edge function secrets (for student OTP reset emails):

   ```bash
   npx supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="HOMS <noreply@yourdomain.com>"
   ```

   Without `RESEND_API_KEY`, OTPs are logged to the function console (development only).

### 5. Create test users

In the Supabase Dashboard, create users under **Authentication → Users**. Set `role`, `full_name`, and `phone` in user metadata when creating accounts:

```json
{
  "role": "warden",
  "full_name": "Dr. Example",
  "phone": "9876543210"
}
```

Valid roles: `student`, `warden`, `security_guard`, `parent`, `admin`.

For student accounts, also insert a row in the `students` table linked to the profile `id`.

For parent accounts, link them to students by matching `parent_phone` or `parent_email` on the student record.

### 6. Run the dev server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── auth/          # ProtectedRoute, RoleRedirect
│   └── layout/        # Shared layout components
├── contexts/
│   └── AuthProvider.tsx
├── lib/
│   ├── supabase.ts    # Supabase client
│   ├── types.ts       # Database & domain types
│   └── routes.ts      # Role → dashboard path mapping
└── pages/
    ├── LoginPage.tsx
    ├── student/
    ├── warden/
    ├── security/
    ├── parent/
    └── admin/
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

## Database Tables

- `profiles` — user roles and contact info (linked to `auth.users`)
- `students` — student hostel and academic details
- `outpass_requests` — outpass / staypass / night pass requests
- `gate_logs` — exit and entry scan events
- `extension_requests` — return-time extension requests

All tables have Row Level Security enabled with role-specific policies.

## Authentication

### Login (`/login`)

- Single input accepts **email** or **student register number** (no role selector).
- Role is read from the `profiles` table after login.
- A loading spinner is shown while the profile is fetched — no dashboard flash.

### Password rules by role

| Role | Initial password | First-login change |
|------|------------------|--------------------|
| Student | `{reg_number}{DDMMYYYY}` e.g. `21CS00101012003` | Required → `/change-password` |
| Warden | Self-chosen (set at account creation) | No |
| Admin | Self-chosen (set at account creation) | No |
| Parent | Set by admin | No |
| Security Guard | Set by admin | No — session persists in `localStorage` until manual sign-out |

### Forgot password (`/forgot-password`)

- **Students:** enter register number → OTP sent to `parent_email` on the student record.
- **All other roles:** enter email → standard Supabase password-reset email.
