-- Throttle anonymous community reports: anyone can still report without
-- logging in, but a single place can't be flooded (e.g. 50 fake "closed"
-- reports in a minute), and notes can't carry spam links.

CREATE OR REPLACE FUNCTION public.place_reports_recent_count(p_place_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.place_reports
  WHERE place_id = p_place_id
    AND created_at > now() - interval '10 minutes';
$$;

REVOKE ALL ON FUNCTION public.place_reports_recent_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_reports_recent_count(text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS place_reports_place_created_idx
  ON public.place_reports (place_id, created_at DESC);

DROP POLICY IF EXISTS "Anyone can add a validated community report" ON public.place_reports;
DROP POLICY IF EXISTS "Anyone can add a validated, throttled community report" ON public.place_reports;

CREATE POLICY "Anyone can add a validated, throttled community report"
ON public.place_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status IN ('open','closed','unknown')
  AND (crowd IS NULL OR crowd IN ('empty','ok','crowded'))
  AND char_length(place_id) BETWEEN 1 AND 200
  AND char_length(btrim(place_name)) BETWEEN 1 AND 200
  AND (note IS NULL OR char_length(btrim(note)) BETWEEN 1 AND 280)
  AND (note IS NULL OR note !~* '(https?://|www\.)')
  AND (visited_on IS NULL OR visited_on <= (now()::date + 1))
  AND public.place_reports_recent_count(place_id) < 5
);

-- Suggestions: keep inserts pending-only and bounded in size.
DROP POLICY IF EXISTS "Anyone can suggest a place pending approval" ON public.external_attractions;

CREATE POLICY "Anyone can suggest a place pending approval"
ON public.external_attractions FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_approved = false
  AND name IS NOT NULL AND length(btrim(name)) BETWEEN 2 AND 120
  AND (city IS NULL OR length(city) <= 80)
  AND (description IS NULL OR length(description) <= 1000)
  AND (min_age IS NULL OR min_age BETWEEN 0 AND 18)
  AND (max_age IS NULL OR max_age BETWEEN 0 AND 18)
  AND (environment IS NULL OR environment IN ('ממוזג','פתוח','משולב'))
);
