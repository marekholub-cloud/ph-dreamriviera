
-- Allow property owners (not just host_id) to view and update reservations on their properties

DROP POLICY IF EXISTS "Hosts can view reservations on their properties" ON public.rental_reservations;
DROP POLICY IF EXISTS "Hosts can update reservations on their properties" ON public.rental_reservations;

CREATE POLICY "Property owners can view reservations on their properties"
ON public.rental_reservations
FOR SELECT
USING (
  auth.uid() = host_id
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_reservations.property_id
      AND rp.owner_id = auth.uid()
  )
);

CREATE POLICY "Property owners can update reservations on their properties"
ON public.rental_reservations
FOR UPDATE
USING (
  auth.uid() = host_id
  OR EXISTS (
    SELECT 1 FROM public.rental_properties rp
    WHERE rp.id = rental_reservations.property_id
      AND rp.owner_id = auth.uid()
  )
);
