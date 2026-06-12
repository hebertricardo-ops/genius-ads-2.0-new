CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_free_credits INT;
BEGIN
  SELECT monthly_credits INTO v_free_credits
  FROM public.plans
  WHERE slug = 'free'
  LIMIT 1;

  v_free_credits := COALESCE(v_free_credits, 40);

  INSERT INTO public.user_credits (
    user_id,
    subscription_credits,
    extra_credits,
    credits_balance
  ) VALUES (
    NEW.id,
    v_free_credits,
    0,
    v_free_credits
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
