-- Add feature flags and limits to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS has_calendar        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_social_media    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_social_profiles INT     NOT NULL DEFAULT 0;

-- Pro plan: no calendar, no social, 4 brands, corrected annual price
UPDATE public.plans SET
  has_calendar        = false,
  has_social_media    = false,
  max_social_profiles = 0,
  price_annual        = 539.10
WHERE slug = 'pro';

-- Advanced plan: calendar + social, 10 brands, 2 social profiles
UPDATE public.plans SET
  has_calendar        = true,
  has_social_media    = true,
  max_social_profiles = 2,
  price_monthly       = 99.90,
  price_annual        = 899.10
WHERE slug = 'advanced';

-- Social Media plan: calendar + social, unlimited brands, 6 social profiles
UPDATE public.plans SET
  has_calendar        = true,
  has_social_media    = true,
  max_social_profiles = 6,
  price_monthly       = 199.90,
  price_annual        = 1799.10
WHERE slug = 'social-media';
