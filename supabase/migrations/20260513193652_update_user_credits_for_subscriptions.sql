ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS subscription_credits INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_credits         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset_at         TIMESTAMPTZ;
