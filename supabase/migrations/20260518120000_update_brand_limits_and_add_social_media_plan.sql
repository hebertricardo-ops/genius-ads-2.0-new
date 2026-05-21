-- Update brand limits for existing plans
UPDATE public.plans SET max_brands = 4    WHERE slug = 'pro';
UPDATE public.plans SET max_brands = 10   WHERE slug = 'advanced';

-- Insert Social Media plan (unlimited brands = NULL)
INSERT INTO public.plans
  (name, slug, monthly_credits, credits_per_item, price_monthly, price_annual, max_brands)
VALUES
  ('Social Media', 'social-media', 2000, 10, 169.90, 1359.20, NULL);
