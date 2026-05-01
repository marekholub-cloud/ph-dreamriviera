
-- ENUMS
CREATE TYPE public.rental_mode AS ENUM ('entire_property', 'rooms_only', 'hybrid');
CREATE TYPE public.rental_property_status AS ENUM ('draft', 'pending_approval', 'active', 'paused', 'blocked', 'archived');
CREATE TYPE public.rental_property_type AS ENUM ('apartment', 'villa', 'studio', 'house', 'townhouse', 'cabin', 'other');
CREATE TYPE public.rental_room_type AS ENUM ('private_room', 'shared_room', 'master_bedroom');
CREATE TYPE public.rental_booking_type AS ENUM ('entire_property', 'room');
CREATE TYPE public.rental_reservation_status AS ENUM ('inquiry', 'pending', 'awaiting_payment', 'confirmed', 'checked_in', 'checked_out', 'cancelled_by_guest', 'cancelled_by_host', 'no_show', 'completed', 'refunded');
CREATE TYPE public.rental_payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'refunded', 'partially_refunded', 'failed');
CREATE TYPE public.rental_cancellation_policy AS ENUM ('flexible', 'moderate', 'strict', 'non_refundable');
CREATE TYPE public.rental_calendar_status AS ENUM ('available', 'blocked', 'booked', 'pending');
CREATE TYPE public.rental_calendar_conflict_mode AS ENUM ('strict_exclusive', 'flexible_partial', 'entire_property_priority');
CREATE TYPE public.rental_media_type AS ENUM ('image', 'video');

-- ============ PROPERTIES ============
CREATE TABLE public.rental_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  property_type rental_property_type NOT NULL DEFAULT 'apartment',
  rental_mode rental_mode NOT NULL DEFAULT 'entire_property',
  calendar_conflict_mode rental_calendar_conflict_mode NOT NULL DEFAULT 'strict_exclusive',
  status rental_property_status NOT NULL DEFAULT 'draft',
  country TEXT NOT NULL DEFAULT 'Costa Rica',
  city TEXT,
  district TEXT,
  address TEXT,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  beds INTEGER NOT NULL DEFAULT 1,
  square_meters INTEGER,
  furnished BOOLEAN NOT NULL DEFAULT true,
  pets_allowed BOOLEAN NOT NULL DEFAULT false,
  smoking_allowed BOOLEAN NOT NULL DEFAULT false,
  children_allowed BOOLEAN NOT NULL DEFAULT true,
  check_in_time TIME DEFAULT '15:00',
  check_out_time TIME DEFAULT '11:00',
  minimum_stay INTEGER NOT NULL DEFAULT 1,
  maximum_stay INTEGER,
  instant_book_enabled BOOLEAN NOT NULL DEFAULT false,
  cancellation_policy rental_cancellation_policy NOT NULL DEFAULT 'moderate',
  house_rules TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  price_per_night NUMERIC,
  price_per_month NUMERIC,
  weekend_price NUMERIC,
  cleaning_fee NUMERIC NOT NULL DEFAULT 0,
  service_fee_pct NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  average_rating NUMERIC,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_properties_owner ON public.rental_properties(owner_id);
CREATE INDEX idx_rental_properties_status ON public.rental_properties(status);
CREATE INDEX idx_rental_properties_city ON public.rental_properties(city);

-- ============ ROOMS ============
CREATE TABLE public.rental_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  room_type rental_room_type NOT NULL DEFAULT 'private_room',
  max_guests INTEGER NOT NULL DEFAULT 1,
  beds INTEGER NOT NULL DEFAULT 1,
  has_private_bathroom BOOLEAN NOT NULL DEFAULT false,
  price_per_night NUMERIC,
  price_per_month NUMERIC,
  status rental_property_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_rooms_property ON public.rental_rooms(property_id);

-- ============ MEDIA ============
CREATE TABLE public.rental_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rental_rooms(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type rental_media_type NOT NULL DEFAULT 'image',
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_media_target_check CHECK (
    (property_id IS NOT NULL AND room_id IS NULL) OR
    (property_id IS NULL AND room_id IS NOT NULL)
  )
);

CREATE INDEX idx_rental_media_property ON public.rental_media(property_id);
CREATE INDEX idx_rental_media_room ON public.rental_media(room_id);

-- ============ AMENITIES ============
CREATE TABLE public.rental_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rental_property_amenities (
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.rental_amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- ============ RESERVATIONS ============
CREATE SEQUENCE public.rental_reservation_code_seq START 1000;

CREATE TABLE public.rental_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code TEXT NOT NULL UNIQUE DEFAULT 'RES-' || nextval('public.rental_reservation_code_seq'),
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE RESTRICT,
  room_id UUID REFERENCES public.rental_rooms(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  infants INTEGER NOT NULL DEFAULT 0,
  pets INTEGER NOT NULL DEFAULT 0,
  booking_type rental_booking_type NOT NULL DEFAULT 'entire_property',
  booking_status rental_reservation_status NOT NULL DEFAULT 'pending',
  payment_status rental_payment_status NOT NULL DEFAULT 'unpaid',
  price_base NUMERIC NOT NULL DEFAULT 0,
  cleaning_fee NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  taxes NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payout_amount NUMERIC,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cancellation_policy_snapshot rental_cancellation_policy,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_reservations_dates_check CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_rental_reservations_property ON public.rental_reservations(property_id);
CREATE INDEX idx_rental_reservations_guest ON public.rental_reservations(guest_id);
CREATE INDEX idx_rental_reservations_host ON public.rental_reservations(host_id);
CREATE INDEX idx_rental_reservations_dates ON public.rental_reservations(check_in_date, check_out_date);

-- ============ AVAILABILITY ============
CREATE TABLE public.rental_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rental_rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status rental_calendar_status NOT NULL DEFAULT 'available',
  price_override NUMERIC,
  min_stay_override INTEGER,
  notes TEXT,
  reservation_id UUID REFERENCES public.rental_reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, room_id, date)
);

CREATE INDEX idx_rental_availability_lookup ON public.rental_availability(property_id, date);

-- ============ REVIEWS ============
CREATE TABLE public.rental_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES public.rental_reservations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rental_rooms(id) ON DELETE SET NULL,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  cleanliness_rating SMALLINT CHECK (cleanliness_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  checkin_rating SMALLINT CHECK (checkin_rating BETWEEN 1 AND 5),
  accuracy_rating SMALLINT CHECK (accuracy_rating BETWEEN 1 AND 5),
  location_rating SMALLINT CHECK (location_rating BETWEEN 1 AND 5),
  value_rating SMALLINT CHECK (value_rating BETWEEN 1 AND 5),
  public_comment TEXT,
  private_feedback TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_reviews_property ON public.rental_reviews(property_id);

-- ============ TRIGGERS for updated_at ============
CREATE TRIGGER trg_rental_properties_updated BEFORE UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_rooms_updated BEFORE UPDATE ON public.rental_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_reservations_updated BEFORE UPDATE ON public.rental_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_availability_updated BEFORE UPDATE ON public.rental_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENABLE RLS ============
ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_reviews ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES: PROPERTIES ============
CREATE POLICY "Public can view active properties" ON public.rental_properties
  FOR SELECT USING (status = 'active');
CREATE POLICY "Owners can view own properties" ON public.rental_properties
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins can view all properties" ON public.rental_properties
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create properties" ON public.rental_properties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "Owners can update own properties" ON public.rental_properties
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can update any property" ON public.rental_properties
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can delete own properties" ON public.rental_properties
  FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can delete any property" ON public.rental_properties
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: ROOMS ============
CREATE POLICY "Public can view rooms of active properties" ON public.rental_rooms
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.status = 'active'));
CREATE POLICY "Owners can manage own rooms" ON public.rental_rooms
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins can manage all rooms" ON public.rental_rooms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: MEDIA ============
CREATE POLICY "Public can view media of active properties" ON public.rental_media
  FOR SELECT USING (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.status = 'active'))
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_rooms r JOIN public.rental_properties p ON p.id = r.property_id WHERE r.id = room_id AND p.status = 'active'))
  );
CREATE POLICY "Owners can manage own media" ON public.rental_media
  FOR ALL USING (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_rooms r JOIN public.rental_properties p ON p.id = r.property_id WHERE r.id = room_id AND p.owner_id = auth.uid()))
  ) WITH CHECK (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.rental_rooms r JOIN public.rental_properties p ON p.id = r.property_id WHERE r.id = room_id AND p.owner_id = auth.uid()))
  );
CREATE POLICY "Admins can manage all media" ON public.rental_media
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: AMENITIES ============
CREATE POLICY "Anyone can view amenities" ON public.rental_amenities
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage amenities" ON public.rental_amenities
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view property amenities" ON public.rental_property_amenities
  FOR SELECT USING (true);
CREATE POLICY "Owners can manage own property amenities" ON public.rental_property_amenities
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins can manage all property amenities" ON public.rental_property_amenities
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: RESERVATIONS ============
CREATE POLICY "Guests can view own reservations" ON public.rental_reservations
  FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Hosts can view reservations on their properties" ON public.rental_reservations
  FOR SELECT USING (auth.uid() = host_id);
CREATE POLICY "Admins can view all reservations" ON public.rental_reservations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create reservations" ON public.rental_reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND guest_id = auth.uid());
CREATE POLICY "Guests can update own reservations" ON public.rental_reservations
  FOR UPDATE USING (auth.uid() = guest_id);
CREATE POLICY "Hosts can update reservations on their properties" ON public.rental_reservations
  FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Admins can manage all reservations" ON public.rental_reservations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: AVAILABILITY ============
CREATE POLICY "Public can view availability of active properties" ON public.rental_availability
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.status = 'active'));
CREATE POLICY "Owners can manage own availability" ON public.rental_availability
  FOR ALL USING (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins can manage all availability" ON public.rental_availability
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ RLS POLICIES: REVIEWS ============
CREATE POLICY "Public can view published reviews" ON public.rental_reviews
  FOR SELECT USING (is_published = true);
CREATE POLICY "Guests can create reviews for completed stays" ON public.rental_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = guest_id AND
    EXISTS (SELECT 1 FROM public.rental_reservations r WHERE r.id = reservation_id AND r.guest_id = auth.uid() AND r.booking_status IN ('checked_out','completed'))
  );
CREATE POLICY "Guests can update own reviews" ON public.rental_reviews
  FOR UPDATE USING (auth.uid() = guest_id);
CREATE POLICY "Admins can manage all reviews" ON public.rental_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ SEED basic amenities ============
INSERT INTO public.rental_amenities (name, category, icon) VALUES
  ('WiFi', 'basics', 'wifi'),
  ('Kitchen', 'basics', 'utensils'),
  ('Air conditioning', 'basics', 'wind'),
  ('Heating', 'basics', 'thermometer'),
  ('Washer', 'basics', 'shirt'),
  ('Dryer', 'basics', 'shirt'),
  ('Free parking', 'features', 'car'),
  ('Pool', 'features', 'waves'),
  ('Hot tub', 'features', 'droplet'),
  ('Beach access', 'features', 'palmtree'),
  ('Pet friendly', 'rules', 'paw-print'),
  ('Smoking allowed', 'rules', 'cigarette'),
  ('TV', 'entertainment', 'tv'),
  ('Workspace', 'basics', 'laptop'),
  ('Self check-in', 'features', 'key'),
  ('Gym', 'features', 'dumbbell'),
  ('Breakfast', 'features', 'coffee'),
  ('Ocean view', 'features', 'eye'),
  ('Mountain view', 'features', 'mountain'),
  ('Garden', 'features', 'flower');
