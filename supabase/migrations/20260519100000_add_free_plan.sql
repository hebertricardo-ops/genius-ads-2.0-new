INSERT INTO public.plans
  (name, slug, monthly_credits, credits_per_item, price_monthly, price_annual,
   has_calendar, has_social_media, max_social_profiles, max_brands, is_active)
VALUES
  ('Free', 'free', 60, 10, 0.00, 0.00, false, false, 0, 2, true)
ON CONFLICT (slug) DO NOTHING;
