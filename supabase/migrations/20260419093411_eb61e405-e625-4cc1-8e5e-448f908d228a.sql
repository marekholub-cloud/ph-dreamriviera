
-- Helper to get the assigned obchodnik for current user without recursing into profiles RLS
CREATE OR REPLACE FUNCTION public.get_my_assigned_obchodnik()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_obchodnik_id FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Referrers can view assigned obchodnik profile" ON public.profiles;

CREATE POLICY "Referrers can view assigned obchodnik profile"
ON public.profiles
FOR SELECT
USING (id = public.get_my_assigned_obchodnik());
