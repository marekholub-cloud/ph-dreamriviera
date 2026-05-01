-- Notifikace hostiteli při nové recenzi + hostovi po check-out

-- 1) Notify host when guest posts a review
CREATE OR REPLACE FUNCTION public.notify_host_on_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_title text;
BEGIN
  SELECT title INTO v_property_title FROM rental_properties WHERE id = NEW.property_id;
  PERFORM public.create_notification(
    NEW.host_id,
    'system_alert'::notification_type,
    'Nová recenze pronájmu',
    format('Host ohodnotil pobyt v %s na %s/5 hvězdiček.', COALESCE(v_property_title, 'pronájmu'), NEW.overall_rating),
    jsonb_build_object('review_id', NEW.id, 'property_id', NEW.property_id, 'rating', NEW.overall_rating)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_host_on_new_review ON public.rental_reviews;
CREATE TRIGGER trg_notify_host_on_new_review
AFTER INSERT ON public.rental_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_new_review();

-- 2) Notify guest after check-out so they can leave a review
CREATE OR REPLACE FUNCTION public.notify_guest_for_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_title text;
  v_already_reviewed boolean;
BEGIN
  IF (TG_OP = 'UPDATE')
     AND NEW.booking_status IN ('checked_out', 'completed')
     AND OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN

    SELECT EXISTS(SELECT 1 FROM rental_reviews WHERE reservation_id = NEW.id) INTO v_already_reviewed;
    IF v_already_reviewed THEN RETURN NEW; END IF;

    SELECT title INTO v_property_title FROM rental_properties WHERE id = NEW.property_id;
    PERFORM public.create_notification(
      NEW.guest_id,
      'system_alert'::notification_type,
      'Ohodnoťte svůj pobyt',
      format('Jak se vám líbil pobyt v %s? Sdílejte zkušenost s ostatními.', COALESCE(v_property_title, 'pronájmu')),
      jsonb_build_object('reservation_id', NEW.id, 'property_id', NEW.property_id, 'action', 'review')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_guest_for_review ON public.rental_reservations;
CREATE TRIGGER trg_notify_guest_for_review
AFTER UPDATE ON public.rental_reservations
FOR EACH ROW EXECUTE FUNCTION public.notify_guest_for_review();