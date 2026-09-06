CREATE TABLE public.external_attractions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  description text,
  category text,
  lat double precision,
  lng double precision,
  open_shabbat boolean,
  environment text,
  min_age integer,
  max_age integer,
  source_url text,
  stroller_accessible boolean NOT NULL DEFAULT false,
  changing_table boolean NOT NULL DEFAULT false,
  easy_parking boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.external_attractions TO anon;
GRANT SELECT, INSERT ON public.external_attractions TO authenticated;
GRANT ALL ON public.external_attractions TO service_role;

ALTER TABLE public.external_attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved suggestions"
ON public.external_attractions FOR SELECT
TO anon, authenticated
USING (is_approved = true);

CREATE POLICY "Anyone can suggest a place pending approval"
ON public.external_attractions FOR INSERT
TO anon, authenticated
WITH CHECK (is_approved = false AND name IS NOT NULL AND length(name) BETWEEN 2 AND 120);

GRANT INSERT ON public.external_attractions TO anon;