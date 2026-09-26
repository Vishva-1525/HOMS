-- Holiday concurrency: stop write-on-read overdue refresh + per-outpass overdue updates

-- 1) Admin stats: read-only (no table-wide overdue rewrite)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_today_ist DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_students', (SELECT COUNT(*)::int FROM public.students WHERE is_active = true),
    'active_outpasses', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE status IN ('approved', 'extended')
        AND departure_at <= now()
        AND return_by >= now()
    ),
    'currently_outside', (
      SELECT COUNT(*)::int
      FROM public.student_campus_status
      WHERE current_status = 'outside'
    ),
    'overdue_returns', (
      SELECT COUNT(*)::int
      FROM public.student_campus_status
      WHERE current_status = 'overdue'
    ),
    'pending_approval', (
      SELECT COUNT(*)::int FROM public.outpass_requests WHERE status = 'pending'
    ),
    'approved_today', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE status IN ('approved', 'extended')
        AND approved_at IS NOT NULL
        AND (approved_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ),
    'passes_this_month', (
      SELECT COUNT(*)::int FROM public.outpass_requests
      WHERE created_at >= date_trunc('month', now())
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2) Admin activity feed: read-only
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
        WHERE o.is_overdue = true AND o.status IN ('approved', 'extended')
      ) events
      ORDER BY occurred_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- 3) Per-outpass overdue update (replaces statement-level full-table refresh on gate_logs)
CREATE OR REPLACE FUNCTION public.refresh_outpass_overdue_flag(p_outpass_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outpass_requests o
  SET is_overdue = CASE
    WHEN o.status NOT IN ('approved', 'extended') THEN false
    WHEN o.allows_multi_daily_scan THEN
      EXISTS (
        SELECT 1
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND gl.checkpoint = 'hostel_exit'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id
          AND (gl.scanned_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND gl.checkpoint = 'hostel_entry'
      )
      AND now() > o.return_by
    ELSE
      EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_exit'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.gate_logs gl
        WHERE gl.outpass_id = o.id AND gl.checkpoint = 'hostel_entry'
      )
      AND now() > o.return_by
  END
  WHERE o.id = p_outpass_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_overdue_for_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_outpass_overdue_flag(OLD.outpass_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_outpass_overdue_flag(NEW.outpass_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_overdue_on_gate_log ON public.gate_logs;
CREATE TRIGGER refresh_overdue_on_gate_log
  AFTER INSERT OR UPDATE OR DELETE ON public.gate_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_overdue_for_row();

-- Keep outpass status changes able to refresh their own overdue flag cheaply
DROP TRIGGER IF EXISTS refresh_overdue_on_outpass ON public.outpass_requests;
CREATE OR REPLACE FUNCTION public.trg_refresh_overdue_on_outpass()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_outpass_overdue_flag(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_overdue_on_outpass
  AFTER INSERT OR UPDATE OF status, return_by, allows_multi_daily_scan ON public.outpass_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_overdue_on_outpass();
