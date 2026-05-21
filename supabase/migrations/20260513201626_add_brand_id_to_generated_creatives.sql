ALTER TABLE public.generated_creatives
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id);

CREATE INDEX idx_generated_creatives_brand_id
  ON public.generated_creatives(brand_id);
