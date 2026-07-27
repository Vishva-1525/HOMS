-- Superior wardens + RT availability (Away / DND) with gender-aware escalation

DO $$ BEGIN
  CREATE TYPE public.warden_tier AS ENUM ('rt', 'superior');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS warden_tier public.warden_tier NOT NULL DEFAULT 'rt';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

-- Existing wardens are RTs (block-assigned)
UPDATE public.profiles
SET warden_tier = 'rt'
WHERE role = 'warden' AND warden_tier IS DISTINCT FROM 'superior';

-- Non-warden roles should not carry warden availability semantics
UPDATE public.profiles
SET warden_tier = 'rt',
    is_available = true,
    unavailable_reason = NULL
WHERE role <> 'warden';

-- Blocks whose RT(s) of a gender are Away (for superior dashboards)
CREATE OR REPLACE FUNCTION public.get_unavailable_rt_blocks(p_gender public.hostel_gender)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT public.normalize_hostel_block(sa.assignment_value)), '{}'::text[])
  FROM public.staff_assignments sa
  JOIN public.profiles p ON p.id = sa.profile_id
  WHERE sa.assignment_type = 'block'
    AND p.role = 'warden'
    AND COALESCE(p.warden_tier, 'rt') = 'rt'
    AND p.gender = p_gender
    AND p.is_available = false
    AND btrim(COALESCE(sa.assignment_value, '')) <> '';
$$;

GRANT EXECUTE ON FUNCTION public.get_unavailable_rt_blocks(public.hostel_gender) TO authenticated;

-- Notify matching RTs always; also notify gender-matched superiors when any RT for that block is Away
CREATE OR REPLACE FUNCTION public.get_warden_ids_for_block(p_block TEXT, p_gender public.hostel_gender)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Block RTs (available or Away — Away is read-only in UI)
  SELECT sa.profile_id
  FROM public.staff_assignments sa
  JOIN public.profiles p ON p.id = sa.profile_id
  WHERE sa.assignment_type = 'block'
    AND public.normalize_hostel_block(sa.assignment_value) = public.normalize_hostel_block(p_block)
    AND p.role = 'warden'
    AND COALESCE(p.warden_tier, 'rt') = 'rt'
    AND p.gender = p_gender

  UNION

  -- Superior wardens of the same gender when any matching RT is Away
  SELECT p.id
  FROM public.profiles p
  WHERE p.role = 'warden'
    AND p.warden_tier = 'superior'
    AND p.gender = p_gender
    AND EXISTS (
      SELECT 1
      FROM public.staff_assignments sa
      JOIN public.profiles rt ON rt.id = sa.profile_id
      WHERE sa.assignment_type = 'block'
        AND public.normalize_hostel_block(sa.assignment_value) = public.normalize_hostel_block(p_block)
        AND rt.role = 'warden'
        AND COALESCE(rt.warden_tier, 'rt') = 'rt'
        AND rt.gender = p_gender
        AND rt.is_available = false
    );
$$;

-- Allow wardens to set their own Away / Working status
CREATE OR REPLACE FUNCTION public.set_warden_availability(
  p_is_available BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_tier public.warden_tier;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.current_user_role() <> 'warden' THEN
    RAISE EXCEPTION 'Only wardens can update availability';
  END IF;

  SELECT COALESCE(warden_tier, 'rt') INTO v_tier
  FROM public.profiles
  WHERE id = v_uid;

  IF v_tier = 'superior' THEN
    RAISE EXCEPTION 'Superior wardens do not use Away mode';
  END IF;

  IF p_is_available IS FALSE THEN
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'Reason is required when going Away';
    END IF;

    UPDATE public.profiles
    SET is_available = false,
        unavailable_reason = btrim(p_reason)
    WHERE id = v_uid;
  ELSE
    UPDATE public.profiles
    SET is_available = true,
        unavailable_reason = NULL
    WHERE id = v_uid;
  END IF;

  RETURN json_build_object(
    'is_available', (SELECT is_available FROM public.profiles WHERE id = v_uid),
    'unavailable_reason', (SELECT unavailable_reason FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_warden_availability(BOOLEAN, TEXT) TO authenticated;
