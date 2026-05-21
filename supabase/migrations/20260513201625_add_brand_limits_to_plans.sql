ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_brands INT;

UPDATE public.plans SET max_brands = 10   WHERE slug = 'pro';
UPDATE public.plans SET max_brands = NULL WHERE slug = 'advanced';
