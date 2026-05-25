-- Função atômica de dedução de créditos
-- Elimina race condition do SELECT + UPDATE separados
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount   INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE public.user_credits
  SET credits_balance = credits_balance - p_amount
  WHERE user_id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Créditos insuficientes'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_credits TO service_role;
