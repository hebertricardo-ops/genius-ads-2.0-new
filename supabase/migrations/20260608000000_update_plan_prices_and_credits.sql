-- Novos preços mensais e anuais (padrão: 9 meses = 3 meses grátis)
UPDATE public.plans SET
  price_monthly       = 39.90,
  price_annual        = 359.10,
  max_social_profiles = 0
WHERE slug = 'pro';

UPDATE public.plans SET
  price_monthly       = 59.90,
  price_annual        = 539.10,
  max_social_profiles = 0
WHERE slug = 'advanced';

UPDATE public.plans SET
  price_monthly       = 99.90,
  price_annual        = 899.10,
  max_social_profiles = 0
WHERE slug = 'social-media';

-- Plano Free: reduzir créditos de 60 para 40
UPDATE public.plans SET
  monthly_credits = 40
WHERE slug = 'free';

-- Atualizar créditos iniciais do usuário free de 60 para 40
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_balance, credits_used) VALUES (NEW.id, 40, 0);
  RETURN NEW;
END;
$$;
