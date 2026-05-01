CREATE POLICY "Admins can create any property"
ON public.rental_properties
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));