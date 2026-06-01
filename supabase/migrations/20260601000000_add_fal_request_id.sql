ALTER TABLE public.generated_creatives ADD COLUMN IF NOT EXISTS fal_request_id TEXT;
ALTER TABLE public.carousel_requests   ADD COLUMN IF NOT EXISTS fal_request_id TEXT;
ALTER TABLE public.creative_edits      ADD COLUMN IF NOT EXISTS fal_request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_generated_creatives_fal_request_id ON public.generated_creatives (fal_request_id) WHERE fal_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creative_edits_fal_request_id      ON public.creative_edits      (fal_request_id) WHERE fal_request_id IS NOT NULL;
