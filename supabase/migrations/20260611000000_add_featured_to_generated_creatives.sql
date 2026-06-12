ALTER TABLE public.generated_creatives
  ADD COLUMN IF NOT EXISTS is_featured   BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_note TEXT;

CREATE INDEX IF NOT EXISTS idx_creatives_featured
  ON public.generated_creatives(is_featured, featured_at DESC)
  WHERE is_featured = true;
