-- Add missing columns to developers
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS developer_code text;

-- Add missing columns to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS service_charge numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS avg_rent_per_night numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS avg_monthly_rent numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS avg_dewa_monthly numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS project_code text;

-- Create payment_plans table
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  schedule jsonb,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment plans are viewable by everyone"
ON public.payment_plans FOR SELECT USING (true);

CREATE POLICY "Admins manage payment plans"
ON public.payment_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create property_units table
CREATE TABLE IF NOT EXISTS public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_type_price_id uuid REFERENCES public.property_unit_prices(id) ON DELETE SET NULL,
  unit_number text,
  floor integer,
  building text,
  price_aed numeric,
  price_per_sqm_aed numeric,
  area_sqm numeric,
  balcony_sqm numeric,
  terrace_sqm numeric,
  total_area_sqm numeric,
  status text DEFAULT 'available',
  payment_plan_id uuid REFERENCES public.payment_plans(id) ON DELETE SET NULL,
  view_type text,
  orientation text,
  has_pool_view boolean DEFAULT false,
  has_sea_view boolean DEFAULT false,
  has_garden_view boolean DEFAULT false,
  has_city_view boolean DEFAULT false,
  has_lagoon_view boolean DEFAULT false,
  has_burj_khalifa_view boolean DEFAULT false,
  bedrooms integer,
  bathrooms integer,
  parking_spots integer,
  storage_included boolean DEFAULT false,
  furnishing text,
  external_id text,
  developer_unit_id text,
  notes text,
  internal_notes text,
  floor_plan_url text,
  illustration_urls jsonb,
  floor_plan_urls jsonb,
  service_charge_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_units_property ON public.property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_property_units_status ON public.property_units(status);

ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property units are viewable by everyone"
ON public.property_units FOR SELECT USING (true);

CREATE POLICY "Admins manage property units"
ON public.property_units FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_units_updated_at
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();