CREATE TABLE public.place_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id text NOT NULL,
  place_name text NOT NULL,
  status text NOT NULL,
  crowd text,
  note text,
  visited_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX place_reports_place_id_idx ON public.place_reports (place_id);

ALTER TABLE public.place_reports
  ADD CONSTRAINT place_reports_status_check CHECK (status IN ('open','closed','unknown')),
  ADD CONSTRAINT place_reports_crowd_check CHECK (crowd IS NULL OR crowd IN ('empty','ok','crowded')),
  ADD CONSTRAINT place_reports_note_len CHECK (note IS NULL OR char_length(note) <= 280),
  ADD CONSTRAINT place_reports_name_len CHECK (char_length(place_name) <= 200),
  ADD CONSTRAINT place_reports_place_id_len CHECK (char_length(place_id) <= 200);

GRANT SELECT, INSERT ON public.place_reports TO anon;
GRANT SELECT, INSERT ON public.place_reports TO authenticated;
GRANT ALL ON public.place_reports TO service_role;

ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community reports"
  ON public.place_reports FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can add a community report"
  ON public.place_reports FOR INSERT TO anon, authenticated WITH CHECK (true);