
DROP POLICY IF EXISTS "Admins can update any property" ON public.rental_properties;
CREATE POLICY "Admins can update any property"
ON public.rental_properties
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners can update own properties" ON public.rental_properties;
CREATE POLICY "Owners can update own properties"
ON public.rental_properties
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
