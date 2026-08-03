DROP POLICY IF EXISTS "Anyone can add a community report" ON public.place_reports;

CREATE POLICY "Anyone can add a validated community report"
ON public.place_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status IN ('open','closed','unknown')
  AND (crowd IS NULL OR crowd IN ('empty','ok','crowded'))
  AND char_length(place_id) BETWEEN 1 AND 200
  AND char_length(btrim(place_name)) BETWEEN 1 AND 200
  AND (note IS NULL OR char_length(btrim(note)) BETWEEN 1 AND 280)
  AND (visited_on IS NULL OR visited_on <= (now()::date + 1))
);