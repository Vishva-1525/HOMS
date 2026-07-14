# HOMS Database Schema, API Patterns & Concurrency / Token-Bloat Audit

**Project:** SVC Homes (Hostel Outpass Management System)  
**Stack:** Supabase (PostgreSQL + Auth + RLS + Edge Functions) · React client (no Prisma/Drizzle ORM)  
**Purpose:** Baseline for high-concurrency redesign (1,000+ users) and large-payload / “token bloat” mitigation.

---

## Executive summary

| Finding | Detail |
|--------|--------|
| **ORM** | None. Schema lives in `supabase/migrations/*.sql`. Client types in `src/lib/types.ts`. |
| **Student create** | **No app API.** Manual: Auth user → trigger creates `profiles` → SQL `INSERT` into `students`. |
| **Student delete** | Soft-delete only in app (`is_active = false`). Hard delete only via DB/cascade (no UI). |
| **Token / payload bloat** | **Not LLM-related.** No OpenAI/Anthropic/embeddings. Bloat = **unbounded PostgREST JSON** into the browser (and Cursor/agent context if dumps are pasted). |
| **Primary offenders** | Admin Students, Admin Passes, Warden Data: `select('*')` of **all** students/passes/gate_logs. Report RPC default limit **10,000** wide joined rows. |

With only a few concurrent admins/wardens, opening those pages can each transfer multi‑MB JSON (thousands of rows × wide columns), which easily looks like a “~40k token” payload when logged, exported, or pasted into an AI context.

---

## 1. Database schema & types

### 1.1 Migration inventory

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Enums, core tables, indexes, auth trigger, RLS |
| `002_auth_enhancements.sql` | `password_changed`, login email RPC, OTP table |
| `003_enable_realtime.sql` | Realtime on outpasses / gate_logs |
| `004` / `004b` | `cancelled` status + policies |
| `005_warden_approved_at.sql` | `approved_at` |
| `006`–`011` | Warden/parent/security access RPCs |
| `012_admin_platform.sql` | `is_active`, overdue, settings, `staff_assignments`, admin RPCs |
| `012_security_gate_student_info.sql` | Gate student info RPC |
| `013_outpass_report_rpc.sql` | `get_outpass_report` (limit default 10k) |
| `014_pwa_notifications.sql` | Push / SMS / outbox |
| `015_student_module_enhancements.sql` | Special pass, academic calendar, quotas |
| `016`–`020` | Period stats, security entry codes, quotas fix, staff list fix |

### 1.2 Core enums (from `001`)

```sql
CREATE TYPE public.user_role AS ENUM (
  'student', 'warden', 'security_guard', 'parent', 'admin'
);
CREATE TYPE public.pass_type AS ENUM ('outpass', 'staypass', 'night_pass');
-- later: special_pass added in 015
CREATE TYPE public.outpass_status AS ENUM (
  'pending', 'approved', 'rejected', 'extended'
);
-- later: cancelled added in 004
CREATE TYPE public.extension_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.gate_event_type AS ENUM ('exit', 'entry');
```

### 1.3 Exact core table definitions

**Source:** `supabase/migrations/001_initial_schema.sql`

```sql
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role       public.user_role NOT NULL DEFAULT 'student',
  full_name  TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id             UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  reg_number     TEXT NOT NULL UNIQUE,
  room_number    TEXT NOT NULL DEFAULT '',
  hostel_block   TEXT NOT NULL DEFAULT '',
  date_of_birth  DATE,
  parent_phone   TEXT NOT NULL DEFAULT '',
  parent_email   TEXT NOT NULL DEFAULT '',
  department     TEXT NOT NULL DEFAULT '',
  year_of_study  INT NOT NULL DEFAULT 1
);

CREATE TABLE public.outpass_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  pass_type     public.pass_type NOT NULL,
  destination   TEXT NOT NULL,
  reason        TEXT NOT NULL,
  departure_at  TIMESTAMPTZ NOT NULL,
  return_by     TIMESTAMPTZ NOT NULL,
  status        public.outpass_status NOT NULL DEFAULT 'pending',
  warden_remark TEXT,
  approved_by   UUID REFERENCES public.profiles (id),
  qr_code_data  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gate_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpass_id  UUID NOT NULL REFERENCES public.outpass_requests (id) ON DELETE CASCADE,
  scanned_by  UUID NOT NULL REFERENCES public.profiles (id),
  event_type  public.gate_event_type NOT NULL,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.extension_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpass_id      UUID NOT NULL REFERENCES public.outpass_requests (id) ON DELETE CASCADE,
  new_return_time TIMESTAMPTZ NOT NULL,
  reason          TEXT NOT NULL,
  status          public.extension_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.4 Important later columns / related tables

From `012_admin_platform.sql` and later migrations:

```sql
-- students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- outpass_requests
ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_note TEXT;
-- also: approved_at (005), entry_code (017), special_pass fields (015)

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  assignment_type  TEXT NOT NULL CHECK (assignment_type IN ('block', 'gate')),
  assignment_value TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, assignment_type)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 1.5 Indexes & constraints (students & related)

| Index / constraint | Table | Notes |
|--------------------|-------|-------|
| PK `id` → `profiles` → `auth.users` | students | CASCADE delete |
| UNIQUE `reg_number` | students | |
| `idx_students_parent_phone` | students | |
| `idx_students_parent_email` | students | |
| `idx_students_is_active` | students | 012 |
| `idx_outpass_requests_student_id` | outpass_requests | |
| `idx_outpass_requests_status` | outpass_requests | |
| `idx_outpass_is_overdue` | outpass_requests | partial |
| `idx_outpass_requests_entry_code` | outpass_requests | unique partial |
| `idx_gate_logs_outpass_id` | gate_logs | |
| unique one exit / one entry per pass | gate_logs | 017 |
| `idx_extension_requests_outpass_id` | extension_requests | |

**Gaps for concurrency:** no composite indexes on `(status, created_at)`, `(hostel_block)`, `(department)`, or `(student_id, status)` beyond single-column student_id.

### 1.6 Frontend TypeScript models

**File:** `src/lib/types.ts`

```ts
export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string
  password_changed: boolean
  created_at: string
}

export interface Student {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  date_of_birth: string | null
  parent_phone: string
  parent_email: string
  department: string
  year_of_study: number
  // is_active added in admin types / student rows
}
```

Auth profile bootstrap (no `students` row auto-created):

```sql
-- 001: handle_new_user
INSERT INTO public.profiles (id, role, full_name, phone)
VALUES (NEW.id, role_from_metadata, full_name, phone);
```

---

## 2. Student ingestion & deletion logic

### 2.1 Create / ingest — **operational only (no bulk API)**

There is **no** edge function or client route that bulk-creates students.

Documented flow (`README.md`):

1. Create user in **Supabase Auth** with metadata `{ role, full_name, phone }`.
2. Trigger `handle_new_user` inserts `profiles`.
3. Manually `INSERT INTO students (...)` with the **same UUID**.

Staff creation **does** exist (wardens/guards only):

- Edge Function: `supabase/functions/admin-create-staff/index.ts`
- Uses service role `auth.admin.createUser` + `staff_assignments` upsert  
- **Does not** touch `students`.

### 2.2 Update (app) — single-row

**File:** `src/hooks/admin/useAdminStudents.ts`

```ts
async function updateStudent(studentId, patch) {
  // optional profiles update (name/phone)
  await supabase.from('profiles').update({ full_name, phone }).eq('id', studentId)
  // optional students update
  await supabase.from('students').update(studentPatch).eq('id', studentId)
  await fetchData() // then reloads EVERYTHING (see §3)
}
```

Pattern: **one-by-one updates**, then **full-table refetch**.

### 2.3 Deactivate (soft delete) — single-row

```ts
async function deactivateStudent(studentId: string) {
  const { error } = await supabase
    .from('students')
    .update({ is_active: false })
    .eq('id', studentId)
  await fetchData() // full reload again
}
```

UI: `AdminStudentsPage` / `AdminStudentDrawer` / `AdminStudentRowActions`.

### 2.4 Hard delete

- RLS permits admin DELETE on profiles/students.
- **No application UI or edge function** performs deletes.
- Cascade: `auth.users` → `profiles` → `students` → `outpass_requests` → `gate_logs` / `extension_requests`.

### 2.5 Edge functions that read students

| Function | Behavior |
|----------|----------|
| `student-forgot-password` | Lookup by `reg_number`, send OTP |
| `student-reset-password` | Lookup by reg, update Auth password |
| `notification-dispatch` | Read `parent_phone` for SMS |

---

## 3. API query & token / payload bloat context

### 3.1 Important clarification

**There is no LLM pipeline in this repo.**  
“Token bloat” in practice maps to:

1. **Huge JSON responses** from PostgREST / RPCs into the SPA.  
2. Those payloads being logged, exported, or pasted into Cursor/ChatGPT (≈4 chars ≈ 1 token → multi‑MB JSON ≈ tens of thousands of tokens).  
3. Multiple concurrent admin/warden tabs each downloading full tables → DB + egress amplification under load.

### 3.2 Ranked offenders (most likely sources of a ~40k-token payload)

#### 🔴 #1 — Admin Students: load **all** students + **all** passes + **all** gate logs

**File:** `src/hooks/admin/useAdminStudents.ts`  
**Triggered by:** `/admin/students` page load.

```ts
const [studentsResult, passesResult] = await Promise.all([
  supabase
    .from('students')
    .select('*, profiles(full_name, phone)')
    .order('reg_number'),
  supabase.from('outpass_requests').select('*'),  // unbounded
])

const passIds = allPasses.map((p) => p.id)
const { data: logsData } = await supabase
  .from('gate_logs')
  .select('*')
  .in('outpass_id', passIds)  // effectively ALL gate logs

// Client then computes campus_status per student by scanning all passes + logs
```

**Why it balloons with few users:** filtering is **client-side**; network pays for the entire hostel history every visit. Even 500 students × thousands of passes/logs → very large JSON.

**Payload path:** Supabase JSON → React state (`students`, `passes`, `gateLogs`) → rendered tables / drawer. No LLM.

---

#### 🔴 #2 — Admin Passes: unbounded nested join + all gate logs + realtime refetch

**File:** `src/hooks/admin/useAdminPasses.ts`  
**Triggered by:** `/admin/passes`.

```ts
const { data: passes } = await supabase
  .from('outpass_requests')
  .select(`
    *,
    students (
      reg_number, room_number, hostel_block,
      profiles ( full_name )
    )
  `)
  .order('created_at', { ascending: false })  // no .range() — UI paginates 25 locally

const { data: logs } = await supabase
  .from('gate_logs')
  .select('*')
  .in('outpass_id', passIds)

// Duplicates log subsets onto each mapped row:
gate_logs: gateLogs.filter((l) => l.outpass_id === p.id)
```

Realtime `postgres_changes` on `outpass_requests` / `gate_logs` re-runs `fetchData()` → **repeat full download**.

---

#### 🔴 #3 — Warden shell: all passes (nested) + all extensions + all gate logs

**File:** `src/hooks/warden/useWardenData.ts`  
**Triggered by:** any `/warden/*` route (via `WardenDataProvider`).

```ts
await Promise.all([
  supabase.from('outpass_requests').select(`
    *,
    students ( reg_number, room_number, hostel_block, profiles ( full_name ) )
  `).order('created_at', { ascending: false }),
  supabase.from('extension_requests').select('*'),
])
// then gate_logs for all pass IDs
```

Shared across pending / out / home → one bad fetch serves all pages, but first load and each debounce-refresh still ship the full history.

---

#### 🟠 #4 — Reports RPC: up to **10,000** wide joined rows as one JSON array

**SQL:** `supabase/migrations/013_outpass_report_rpc.sql`  
**Client:** `src/hooks/useReportData.ts`

```ts
const EXPORT_LIMIT = 10_000

await supabase.rpc('get_outpass_report', {
  p_start, p_end, p_hostel_block, p_department,
  p_limit: limit,  // default / export = 10_000
})
```

RPC returns `json_agg(row_to_json(...))` with fields including:

`reg_number, student_name, room, block, dept, year, pass_type, destination, reason, departure_at, return_by, status, warden_remark, submitted_at, actual_exit/entry, hours_outside, is_overdue, approved_by_name, outpass_id`

**Also** calls `refresh_outpass_overdue_flags()` (writes!) on every report read → concurrency hazard.

Export path (`fetchAllForExport`) deliberately pulls the full 10k blob into memory for Excel/PDF.

---

#### 🟡 #5 — Report filter helpers: all students’ blocks/depts

```ts
supabase.from('students').select('hostel_block')   // every row
supabase.from('students').select('department')     // every row
```

Distinct done in JS.

---

#### 🟢 Scoped (OK for concurrency if history stays small)

**File:** `src/hooks/useStudentData.ts` — student-scoped:

```ts
.from('outpass_requests').select('*').eq('student_id', userId)
// then gate_logs / extensions for that student's pass IDs only
```

Fine for 1k concurrent **students**; still grows with years of personal history (add limit/archives later).

---

### 3.3 How payloads reach “context”

| Path | Mechanism |
|------|-----------|
| Browser | Full JSON held in React state; DevTools Network tab |
| Excel/PDF export | `fetchAllForExport` → `report-export/*` |
| Agent / “token bloat” | Pasting Network response / console dumps / CSV into Chat |
| LLM in product | **None found** |

---

## 4. Architecture recommendations (for redesign)

### Query layer

1. **Server-side pagination** for admin students/passes (`range` + count; filters in SQL).
2. **Never** `select('*')` on `outpass_requests` / `gate_logs` without `WHERE` + `LIMIT`.
3. Replace client campus-status computation with a **SQL view/RPC** returning only `{ student_id, campus_status }`.
4. Warden: filter by **block assignment** at query time, not after full download.
5. Reports: lower default limit (e.g. 200–500 screen page); streaming/chunked export; stop calling `refresh_outpass_overdue_flags()` inside read path (use scheduled job).

### Indexes (add)

```sql
CREATE INDEX ON outpass_requests (created_at DESC);
CREATE INDEX ON outpass_requests (student_id, status);
CREATE INDEX ON outpass_requests (status, created_at DESC);
CREATE INDEX ON students (hostel_block);
CREATE INDEX ON students (department);
CREATE INDEX ON students (year_of_study);
```

### Student lifecycle

6. Add `admin-create-students` edge function with **bulk** `createUser` + multi-row `INSERT … VALUES` / CSV import.
7. Soft-delete already exists; avoid loading inactive students by default (`WHERE is_active`).

### Concurrency

8. Cap realtime: invalidate narrow queries or poll; do not refetch entire tables on every `postgres_changes`.
9. Connection pooling (Supabase pooler) + avoid report RPC write amplification.

---

## 5. Quick reference — heaviest call sites

| Rank | File | Query shape | Bound? |
|------|------|-------------|--------|
| 1 | `src/hooks/admin/useAdminStudents.ts` | all students + all passes + all gate_logs | ❌ |
| 2 | `src/hooks/admin/useAdminPasses.ts` | all passes nested + all gate_logs | ❌ (UI page 25) |
| 3 | `src/hooks/warden/useWardenData.ts` | all passes nested + all extensions + logs | ❌ |
| 4 | `src/hooks/useReportData.ts` + `013_*.sql` | report JSON up to 10k rows | soft limit 10k |
| 5 | `src/hooks/useStudentData.ts` | own passes + related logs | ✅ by student |

---

*Generated from codebase scan of HOMS migrations, hooks, edge functions, and types. No Prisma/Drizzle models present.*
