ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS has_analytics BOOLEAN DEFAULT false;

UPDATE public.plans SET has_analytics = true WHERE slug IN ('advanced', 'social-media');
