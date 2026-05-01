ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_cs text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS short_description_en text,
  ADD COLUMN IF NOT EXISTS short_description_cs text,
  ADD COLUMN IF NOT EXISTS short_description_es text;