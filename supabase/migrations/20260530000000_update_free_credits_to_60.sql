-- Atualiza créditos iniciais do usuário free de 4 para 60
-- (permite criar até 6 criativos ou 1 carrossel com 6 slides a 10 créditos cada)
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_balance, credits_used) VALUES (NEW.id, 60, 0);
  RETURN NEW;
END;
$$;
