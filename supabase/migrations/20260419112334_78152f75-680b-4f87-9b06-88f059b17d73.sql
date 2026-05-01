-- Wishlist for rental properties
CREATE TABLE public.rental_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_rental_favorites_user ON public.rental_favorites(user_id);
CREATE INDEX idx_rental_favorites_property ON public.rental_favorites(property_id);

ALTER TABLE public.rental_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rental favorites"
ON public.rental_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users add own rental favorites"
ON public.rental_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own rental favorites"
ON public.rental_favorites FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all rental favorites"
ON public.rental_favorites FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));