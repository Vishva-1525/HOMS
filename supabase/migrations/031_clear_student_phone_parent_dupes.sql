-- CSV / bulk import phone numbers are parent contacts only.
-- Clear student profiles.phone where it was incorrectly copied from parent_phone
-- so students must enter their own number on the profile page.

UPDATE public.profiles AS p
SET phone = ''
FROM public.students AS s
WHERE s.id = p.id
  AND p.role = 'student'
  AND COALESCE(p.phone, '') <> ''
  AND COALESCE(s.parent_phone, '') <> ''
  AND regexp_replace(p.phone, '\s+', '', 'g')
    = regexp_replace(s.parent_phone, '\s+', '', 'g');
