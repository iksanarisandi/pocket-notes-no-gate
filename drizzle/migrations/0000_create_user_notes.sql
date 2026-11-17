CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);