-- Anonymous search insights: which areas return few results, so the admin
-- knows where to add places. No IP, no free text; location rounded to ~5 km.
-- Only the server (service role) can read or write — no public policies.

CREATE TABLE IF NOT EXISTS public.search_insights (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('ai', 'itinerary', 'manual', 'open_now')),
  area text CHECK (area IS NULL OR char_length(area) <= 40),
  lat numeric(6, 2),
  lng numeric(6, 2),
  vibe text CHECK (vibe IS NULL OR char_length(vibe) <= 20),
  indoor text CHECK (indoor IS NULL OR indoor IN ('ממוזג', 'פתוח')),
  free_only boolean,
  result_count integer NOT NULL CHECK (result_count >= 0)
);

CREATE INDEX IF NOT EXISTS search_insights_created_idx
  ON public.search_insights (created_at DESC);

ALTER TABLE public.search_insights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_insights FROM anon, authenticated;
GRANT ALL ON public.search_insights TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.search_insights_id_seq TO service_role;

-- Remove the placeholder row an old example script could have inserted.
DELETE FROM public.external_attractions WHERE name = 'פסטיבל שבת בטבע - דוגמה';
