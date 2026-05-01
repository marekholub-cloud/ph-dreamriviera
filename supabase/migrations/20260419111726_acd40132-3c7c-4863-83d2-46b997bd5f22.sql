
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superhost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superhost_evaluated_at timestamptz;

CREATE OR REPLACE VIEW public.rental_host_stats
WITH (security_invoker = true)
AS
WITH props AS (
  SELECT owner_id AS host_id, COUNT(*) AS properties_count
  FROM rental_properties WHERE status = 'active' GROUP BY owner_id
),
res AS (
  SELECT host_id,
    COUNT(*) AS reservations_total,
    COUNT(*) FILTER (WHERE booking_status IN ('checked_out','completed')) AS reservations_completed,
    COUNT(*) FILTER (WHERE booking_status IN ('cancelled_by_guest','cancelled_by_host','no_show')) AS reservations_cancelled
  FROM rental_reservations GROUP BY host_id
),
revs AS (
  SELECT rp.owner_id AS host_id,
    AVG(rr.overall_rating)::numeric(3,2) AS avg_rating,
    COUNT(rr.id) AS reviews_count
  FROM rental_reviews rr
  JOIN rental_properties rp ON rp.id = rr.property_id
  WHERE rr.is_published = true GROUP BY rp.owner_id
),
threads AS (
  SELECT host_id,
    COUNT(*) AS threads_total,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM rental_messages rm
        WHERE rm.thread_id = rmt.id AND rm.sender_id = rmt.host_id
      )
    ) AS threads_responded
  FROM rental_message_threads rmt GROUP BY host_id
)
SELECT
  p.id AS host_id, p.full_name, p.email,
  p.is_superhost, p.superhost_evaluated_at,
  COALESCE(props.properties_count, 0) AS properties_count,
  COALESCE(res.reservations_total, 0) AS reservations_total,
  COALESCE(res.reservations_completed, 0) AS reservations_completed,
  COALESCE(res.reservations_cancelled, 0) AS reservations_cancelled,
  CASE WHEN COALESCE(res.reservations_total, 0) = 0 THEN 0
       ELSE ROUND(res.reservations_cancelled::numeric / res.reservations_total * 100, 1) END AS cancellation_rate_pct,
  COALESCE(revs.avg_rating, 0) AS avg_rating,
  COALESCE(revs.reviews_count, 0) AS reviews_count,
  COALESCE(threads.threads_total, 0) AS threads_total,
  COALESCE(threads.threads_responded, 0) AS threads_responded,
  CASE WHEN COALESCE(threads.threads_total, 0) = 0 THEN 100
       ELSE ROUND(threads.threads_responded::numeric / threads.threads_total * 100, 1) END AS response_rate_pct
FROM profiles p
LEFT JOIN props ON props.host_id = p.id
LEFT JOIN res ON res.host_id = p.id
LEFT JOIN revs ON revs.host_id = p.id
LEFT JOIN threads ON threads.host_id = p.id
WHERE COALESCE(props.properties_count, 0) > 0;

CREATE OR REPLACE FUNCTION public.evaluate_superhost_status(p_host_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_completed int; v_cancel_rate numeric; v_avg numeric; v_response numeric;
        v_should_be boolean; v_current boolean;
BEGIN
  SELECT reservations_completed, cancellation_rate_pct, avg_rating, response_rate_pct
  INTO v_completed, v_cancel_rate, v_avg, v_response
  FROM rental_host_stats WHERE host_id = p_host_id;

  v_should_be := (
    COALESCE(v_completed, 0) >= 10
    AND COALESCE(v_avg, 0) >= 4.7
    AND COALESCE(v_cancel_rate, 0) <= 1
    AND COALESCE(v_response, 0) >= 90
  );

  SELECT is_superhost INTO v_current FROM profiles WHERE id = p_host_id;
  UPDATE profiles SET is_superhost = v_should_be, superhost_evaluated_at = now() WHERE id = p_host_id;

  IF v_should_be IS DISTINCT FROM COALESCE(v_current, false) THEN
    PERFORM public.create_notification(
      p_host_id, 'system_alert'::notification_type,
      CASE WHEN v_should_be THEN '🏆 Získali jste status Super-host!' ELSE 'Status Super-host pozastaven' END,
      CASE WHEN v_should_be
           THEN 'Gratulujeme! Vaše pronájmy splňují všechny standardy Super-host programu.'
           ELSE 'Vaše statistiky aktuálně nesplňují podmínky Super-host. Zkontrolujte hodnocení a response rate.' END,
      jsonb_build_object('completed', v_completed, 'avg_rating', v_avg, 'cancel_rate', v_cancel_rate, 'response_rate', v_response)
    );
  END IF;
  RETURN v_should_be;
END; $$;

CREATE OR REPLACE FUNCTION public.evaluate_all_superhosts()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_count int := 0;
BEGIN
  FOR v_id IN SELECT host_id FROM rental_host_stats LOOP
    PERFORM public.evaluate_superhost_status(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_evaluate_superhost_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid;
BEGIN
  SELECT owner_id INTO v_host FROM rental_properties WHERE id = NEW.property_id;
  IF v_host IS NOT NULL THEN PERFORM public.evaluate_superhost_status(v_host); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS rental_reviews_evaluate_superhost ON public.rental_reviews;
CREATE TRIGGER rental_reviews_evaluate_superhost
AFTER INSERT OR UPDATE ON public.rental_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_evaluate_superhost_on_review();
