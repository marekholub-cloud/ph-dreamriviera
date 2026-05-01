CREATE TYPE public.rental_pricing_rule_type AS ENUM ('seasonal', 'weekend', 'length_of_stay');
CREATE TYPE public.rental_pricing_adjustment_type AS ENUM ('percentage', 'fixed_amount', 'override_price');

CREATE TABLE public.rental_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rental_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type public.rental_pricing_rule_type NOT NULL,
  adjustment_type public.rental_pricing_adjustment_type NOT NULL,
  adjustment_value NUMERIC NOT NULL,
  start_date DATE,
  end_date DATE,
  weekdays INTEGER[],
  min_nights INTEGER,
  max_nights INTEGER,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_pricing_rules_property ON public.rental_pricing_rules(property_id);
CREATE INDEX idx_rental_pricing_rules_dates ON public.rental_pricing_rules(start_date, end_date);

ALTER TABLE public.rental_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rules for active rentals"
ON public.rental_pricing_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_pricing_rules.property_id
      AND rp.status = 'active'
  )
);

CREATE POLICY "Owners managers admins can view all rules"
ON public.rental_pricing_rules FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_pricing_rules.property_id
      AND (rp.owner_id = auth.uid() OR rp.property_manager_id = auth.uid())
  )
);

CREATE POLICY "Owners managers admins can insert rules"
ON public.rental_pricing_rules FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_pricing_rules.property_id
      AND (rp.owner_id = auth.uid() OR rp.property_manager_id = auth.uid())
  )
);

CREATE POLICY "Owners managers admins can update rules"
ON public.rental_pricing_rules FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_pricing_rules.property_id
      AND (rp.owner_id = auth.uid() OR rp.property_manager_id = auth.uid())
  )
);

CREATE POLICY "Owners managers admins can delete rules"
ON public.rental_pricing_rules FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_pricing_rules.property_id
      AND (rp.owner_id = auth.uid() OR rp.property_manager_id = auth.uid())
  )
);

CREATE TRIGGER trg_rental_pricing_rules_updated_at
BEFORE UPDATE ON public.rental_pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();