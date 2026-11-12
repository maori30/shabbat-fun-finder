DROP POLICY IF EXISTS "Anyone can read community reports" ON public.place_reports;
CREATE POLICY "Anyone can read recent community reports" ON public.place_reports
FOR SELECT TO anon, authenticated
USING (created_at >= now() - interval '180 days');