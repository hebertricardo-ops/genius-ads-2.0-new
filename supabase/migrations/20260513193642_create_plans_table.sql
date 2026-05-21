CREATE TABLE public.plans (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  monthly_credits  INT NOT NULL,
  credits_per_item INT NOT NULL DEFAULT 10,
  price_monthly    NUMERIC(10,2) NOT NULL,
  price_annual     NUMERIC(10,2) NOT NULL,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.plans
  (name, slug, monthly_credits, credits_per_item, price_monthly, price_annual)
VALUES
  ('Pro',      'pro',      500,  10, 59.90, 539.10),
  ('Advanced', 'advanced', 1000, 10, 89.90, 719.20);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos visíveis para todos"
  ON public.plans FOR SELECT
  USING (true);
