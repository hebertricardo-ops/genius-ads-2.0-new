ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_brands_is_deleted ON public.brands (user_id, is_deleted);
