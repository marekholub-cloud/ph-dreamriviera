
-- Tabulka výplat (payouts) hostitelům za dokončené rezervace
CREATE TABLE public.rental_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES public.rental_reservations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  payout_method TEXT,
  payout_reference TEXT,
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reservation_id)
);

CREATE INDEX idx_rental_payouts_host ON public.rental_payouts(host_id);
CREATE INDEX idx_rental_payouts_status ON public.rental_payouts(status);
CREATE INDEX idx_rental_payouts_created ON public.rental_payouts(created_at DESC);

ALTER TABLE public.rental_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts view own payouts" ON public.rental_payouts
  FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Admins manage all payouts" ON public.rental_payouts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_rental_payouts_updated_at
  BEFORE UPDATE ON public.rental_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings: výchozí service fee % (bere si admin z chatbot_settings nebo výchozí 10%)
-- Auto-create payout when reservation is completed/checked_out
CREATE OR REPLACE FUNCTION public.create_payout_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_fee_pct numeric := 0.10; -- default 10%
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF (TG_OP = 'UPDATE')
     AND NEW.booking_status IN ('checked_out','completed')
     AND OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN

    IF EXISTS (SELECT 1 FROM rental_payouts WHERE reservation_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_gross := COALESCE(NEW.total_amount, 0) - COALESCE(NEW.taxes, 0);
    v_fee := COALESCE(NEW.service_fee, 0);
    IF v_fee = 0 THEN
      v_fee := ROUND(v_gross * v_service_fee_pct, 2);
    END IF;
    v_net := COALESCE(NEW.payout_amount, v_gross - v_fee);

    INSERT INTO rental_payouts (
      host_id, reservation_id, property_id,
      gross_amount, service_fee, net_amount, currency, status, scheduled_at
    ) VALUES (
      NEW.host_id, NEW.id, NEW.property_id,
      v_gross, v_fee, v_net, NEW.currency, 'pending', now() + interval '1 day'
    );

    PERFORM public.create_notification(
      NEW.host_id,
      'system_alert'::notification_type,
      'Nová výplata připravena',
      format('Výplata %s %s za rezervaci %s je naplánována.', v_net, NEW.currency, NEW.reservation_code),
      jsonb_build_object('reservation_id', NEW.id, 'amount', v_net, 'currency', NEW.currency)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_payout_on_completion ON public.rental_reservations;
CREATE TRIGGER trg_create_payout_on_completion
AFTER UPDATE ON public.rental_reservations
FOR EACH ROW EXECUTE FUNCTION public.create_payout_on_completion();
