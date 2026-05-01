ALTER TABLE public.rental_properties
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_rental_properties_coords
  ON public.rental_properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;