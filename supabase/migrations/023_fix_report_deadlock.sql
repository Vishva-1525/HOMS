-- Fix reports deadlock: get_outpass_report must not UPDATE rows on every read.
-- Concurrent report opens + gate/outpass triggers were fighting over outpass_requests locks.

CREATE OR REPLACE FUNCTION public.get_outpass_report(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_hostel_block TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10000
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('warden', 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Read-only: compute overdue inline (same rules as refresh_outpass_overdue_flags).
  -- Do NOT call refresh_outpass_overdue_flags() here — it locks the whole table.

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
        (
          o.status IN ('approved', 'extended')
          AND o.return_by < now()
          AND entry_log.scanned_at IS NULL
        ) AS is_overdue,
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
