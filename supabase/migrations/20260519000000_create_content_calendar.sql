CREATE TABLE public.content_calendar (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id            UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  scheduled_date      DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'idea'
                        CHECK (status IN ('idea', 'draft', 'ready', 'scheduled', 'published')),
  platform            TEXT CHECK (platform IN ('instagram', 'facebook', 'both', 'tiktok')),
  content_type        TEXT CHECK (content_type IN ('post', 'carousel', 'story', 'reel', 'video')),
  creative_id         UUID REFERENCES public.generated_creatives(id) ON DELETE SET NULL,
  carousel_request_id UUID REFERENCES public.carousel_requests(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_calendar_user_id       ON public.content_calendar(user_id);
CREATE INDEX idx_content_calendar_brand_id      ON public.content_calendar(brand_id);
CREATE INDEX idx_content_calendar_scheduled_date ON public.content_calendar(scheduled_date);

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar posts"
  ON public.content_calendar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar posts"
  ON public.content_calendar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar posts"
  ON public.content_calendar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar posts"
  ON public.content_calendar FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER handle_content_calendar_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
