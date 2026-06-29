-- =============================================================================
-- HOMS: Apply admin platform + report RPCs (migrations 012 + 013)
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Project: https://supabase.com/dashboard/project/xdhemtjljklzmynocout
-- =============================================================================

-- --- 007_notifications_log.sql (required before 014) ---

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON public.notifications_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON public.notifications_log (created_at DESC);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_log_select_own ON public.notifications_log;
CREATE POLICY notifications_log_select_own
  ON public.notifications_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_log_update_own ON public.notifications_log;
CREATE POLICY notifications_log_update_own
  ON public.notifications_log FOR UPDATE
  USING (user_id = auth.uid());

-- --- 012_admin_platform.sql (abbreviated: schema + RPCs) ---

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.outpass_requests
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_note TEXT;

CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.system_settings (key, value) VALUES
  ('max_outpass_hours', '24'),
  ('max_staypass_days', '2'),
  ('max_night_pass_hours', '78'),
  ('sms_notifications_enabled', 'true'),
  ('email_notifications_enabled', 'true'),
  ('college_name', 'Sri Venkateswara College of Engineering'),
  ('hostel_name', 'SVCE Hostel')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  assignment_type  TEXT NOT NULL CHECK (assignment_type IN ('block', 'gate')),
  assignment_value TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, assignment_type)
);

CREATE INDEX IF NOT EXISTS idx_students_is_active ON public.students (is_active);
CREATE INDEX IF NOT EXISTS idx_outpass_is_overdue ON public.outpass_requests (is_overdue) WHERE is_overdue = true;

CREATE OR REPLACE FUNCTION public.refresh_outpass_overdue_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outpass_requests o
  SET is_overdue = false
  WHERE o.status NOT IN ('approved', 'extended');

  UPDATE public.outpass_requests o
  SET is_overdue = (
    o.status = 'approved'
    AND o.return_by < now()
    AND NOT EXISTS (
      SELECT 1 FROM public.gate_logs gl
      WHERE gl.outpass_id = o.id AND gl.event_type = 'entry'
    )
  )
  WHERE o.status IN ('approved', 'extended');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_outpass_overdue_flags();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_overdue_on_gate_log ON public.gate_logs;
CREATE TRIGGER refresh_overdue_on_gate_log
  AFTER INSERT OR UPDATE OR DELETE ON public.gate_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_overdue();

DROP TRIGGER IF EXISTS refresh_overdue_on_outpass ON public.outpass_requests;
CREATE TRIGGER refresh_overdue_on_outpass
  AFTER INSERT OR UPDATE OF status, return_by ON public.outpass_requests
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_overdue();

SELECT public.refresh_outpass_overdue_flags();

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.refresh_outpass_overdue_flags();

  SELECT json_build_object(
    'total_students', (SELECT COUNT(*)::int FROM public.students WHERE is_active = true),
    'active_outpasses', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE status IN ('approved', 'extended')
        AND departure_at <= now()
        AND return_by >= now()
    ),
    'currently_outside', (
      SELECT COUNT(*)::int FROM (
        SELECT DISTINCT ON (gl.outpass_id) gl.outpass_id, gl.event_type
        FROM public.gate_logs gl
        JOIN public.outpass_requests o ON o.id = gl.outpass_id
        WHERE o.status IN ('approved', 'extended')
        ORDER BY gl.outpass_id, gl.scanned_at DESC
      ) latest
      WHERE event_type = 'exit'
    ),
    'overdue_returns', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE is_overdue = true AND status = 'approved'
    ),
    'pending_approval', (
      SELECT COUNT(*)::int FROM public.outpass_requests WHERE status = 'pending'
    ),
    'passes_this_month', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE created_at >= date_trunc('month', now())
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_activity_feed(p_limit INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.refresh_outpass_overdue_flags();

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.occurred_at DESC), '[]'::json)
    FROM (
      SELECT * FROM (
        SELECT
          'request_submitted'::text AS event_type,
          o.id::text AS source_id,
          o.student_id,
          o.created_at AS occurred_at,
          o.pass_type::text AS pass_type,
          o.destination,
          o.warden_remark,
          o.return_by,
          NULL::timestamptz AS scanned_at
        FROM public.outpass_requests o

        UNION ALL

        SELECT
          'request_approved'::text,
          o.id::text,
          o.student_id,
          COALESCE(o.approved_at, o.created_at),
          o.pass_type::text,
          o.destination,
          o.warden_remark,
          o.return_by,
          NULL::timestamptz
        FROM public.outpass_requests o
        WHERE o.status IN ('approved', 'extended')
          AND o.approved_at IS NOT NULL

        UNION ALL

        SELECT
          'request_rejected'::text,
          o.id::text,
          o.student_id,
          GREATEST(o.created_at, COALESCE(o.approved_at, o.created_at)),
          o.pass_type::text,
          o.destination,
          o.warden_remark,
          o.return_by,
          NULL::timestamptz
        FROM public.outpass_requests o
        WHERE o.status = 'rejected'

        UNION ALL

        SELECT
          CASE gl.event_type WHEN 'exit' THEN 'gate_exit' ELSE 'gate_entry' END,
          gl.id::text,
          o.student_id,
          gl.scanned_at,
          o.pass_type::text,
          o.destination,
          NULL::text,
          o.return_by,
          gl.scanned_at
        FROM public.gate_logs gl
        JOIN public.outpass_requests o ON o.id = gl.outpass_id

        UNION ALL

        SELECT
          'overdue_alert'::text,
          o.id::text,
          o.student_id,
          o.return_by,
          o.pass_type::text,
          o.destination,
          NULL::text,
          o.return_by,
          NULL::timestamptz
        FROM public.outpass_requests o
        WHERE o.is_overdue = true AND o.status = 'approved'
      ) events
      ORDER BY occurred_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_activity_feed(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_staff_list(p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.full_name), '[]'::json)
    FROM (
      SELECT
        p.id,
        p.full_name,
        p.phone,
        p.role::text,
        u.email,
        u.last_sign_in_at,
        sa.assignment_value,
        (
          SELECT COUNT(*)::int FROM public.gate_logs gl
          WHERE gl.scanned_by = p.id
            AND gl.scanned_at >= date_trunc('day', now())
        ) AS scans_today
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      LEFT JOIN public.staff_assignments sa ON sa.profile_id = p.id
      WHERE p.role::text = p_role
    ) s
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_staff_list(TEXT) TO authenticated;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system settings" ON public.system_settings;
CREATE POLICY "Admins can read system settings"
  ON public.system_settings FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
CREATE POLICY "Admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage staff assignments" ON public.staff_assignments;
CREATE POLICY "Admins can manage staff assignments"
  ON public.staff_assignments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all students" ON public.students;
CREATE POLICY "Admins can read all students"
  ON public.students FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all students" ON public.students;
CREATE POLICY "Admins can update all students"
  ON public.students FOR UPDATE
  USING (public.is_admin());

-- --- 013_outpass_report_rpc.sql ---

CREATE OR REPLACE FUNCTION public.get_outpass_report(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_hostel_block TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('warden', 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public.refresh_outpass_overdue_flags();

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.departure_at DESC), '[]'::json)
    FROM (
      SELECT
        s.reg_number,
        p.full_name AS student_name,
        s.room_number,
        s.hostel_block,
        s.department,
        s.year_of_study,
        o.pass_type::text AS pass_type,
        o.destination,
        o.reason,
        o.departure_at,
        o.return_by,
        o.status::text AS status,
        o.warden_remark,
        o.created_at AS submitted_at,
        exit_log.scanned_at AS actual_exit_time,
        entry_log.scanned_at AS actual_entry_time,
        CASE
          WHEN exit_log.scanned_at IS NOT NULL AND entry_log.scanned_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (entry_log.scanned_at - exit_log.scanned_at)) / 3600.0
          ELSE NULL
        END AS hours_outside,
        o.is_overdue,
        approver.full_name AS approved_by_name,
        o.id AS outpass_id
      FROM public.outpass_requests o
      JOIN public.students s ON s.id = o.student_id
      JOIN public.profiles p ON p.id = s.id
      LEFT JOIN LATERAL (
        SELECT gl.scanned_at
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.event_type = 'exit'
        ORDER BY gl.scanned_at ASC
        LIMIT 1
      ) exit_log ON true
      LEFT JOIN LATERAL (
        SELECT gl.scanned_at
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.event_type = 'entry'
        ORDER BY gl.scanned_at DESC
        LIMIT 1
      ) entry_log ON true
      LEFT JOIN public.profiles approver ON approver.id = o.approved_by
      WHERE o.departure_at >= p_start
        AND o.departure_at <= p_end
        AND (p_hostel_block IS NULL OR p_hostel_block = '' OR s.hostel_block = p_hostel_block)
        AND (p_department IS NULL OR p_department = '' OR s.department = p_department)
      ORDER BY o.departure_at DESC
      LIMIT p_limit
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_outpass_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT) TO authenticated;

DROP POLICY IF EXISTS "Wardens can read own staff assignment" ON public.staff_assignments;
CREATE POLICY "Wardens can read own staff assignment"
  ON public.staff_assignments FOR SELECT
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
  );

-- Reload PostgREST schema cache so RPCs are visible immediately
NOTIFY pgrst, 'reload schema';
