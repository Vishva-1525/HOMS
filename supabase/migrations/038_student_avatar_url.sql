-- Student profile photos (Supabase Storage public URLs)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.avatar_url IS
  'Public URL for profile photo (e.g. from student-profiles storage bucket).';
