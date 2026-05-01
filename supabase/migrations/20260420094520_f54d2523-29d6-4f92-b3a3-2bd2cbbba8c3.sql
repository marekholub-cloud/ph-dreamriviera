-- Grant moderators (Správci) full access to rental data, similar to admins
-- Helper: moderator has same rental management privileges as admin

-- rental_properties
CREATE POLICY "Moderators can manage all rental properties"
ON public.rental_properties FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_reservations
CREATE POLICY "Moderators can manage all rental reservations"
ON public.rental_reservations FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_transactions
CREATE POLICY "Moderators can manage all rental transactions"
ON public.rental_transactions FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_payouts
CREATE POLICY "Moderators can manage all payouts"
ON public.rental_payouts FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_availability
CREATE POLICY "Moderators can manage all availability"
ON public.rental_availability FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_rooms
CREATE POLICY "Moderators can manage all rooms"
ON public.rental_rooms FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_media
CREATE POLICY "Moderators can manage all media"
ON public.rental_media FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- rental_pricing_rules
CREATE POLICY "Moderators can manage all pricing rules"
ON public.rental_pricing_rules FOR ALL
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));