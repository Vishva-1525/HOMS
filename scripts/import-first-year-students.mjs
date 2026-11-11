/**
 * Wrapper — canonical script lives in supabase/migrations.
 *   node scripts/import-first-year-students.mjs
 *   node supabase/migrations/import-first-year-students.mjs
 */
await import('../supabase/migrations/import-first-year-students.mjs')
