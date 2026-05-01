-- Helper: is current user owner OR property_manager of given property?
CREATE OR REPLACE FUNCTION public.can_manage_rental_property(_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rental_properties p
    WHERE p.id = _property_id
      AND (
        p.owner_id = auth.uid()
        OR p.property_manager_id = auth.uid()
      )
  );
$$;

-- Replace existing "Owners can manage own rooms" with broader rule
DROP POLICY IF EXISTS "Owners can manage own rooms" ON public.rental_rooms;

CREATE POLICY "Owners or managers can manage rooms"
ON public.rental_rooms
FOR ALL
TO public
USING (public.can_manage_rental_property(property_id))
WITH CHECK (public.can_manage_rental_property(property_id));
