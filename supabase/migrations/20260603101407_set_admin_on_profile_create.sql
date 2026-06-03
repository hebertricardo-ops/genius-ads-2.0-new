-- Função: marca is_admin = true quando o email é o do admin
CREATE OR REPLACE FUNCTION public.set_admin_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email = 'hebertricardo@gmail.com' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: executa no INSERT e UPDATE de profiles
DROP TRIGGER IF EXISTS trg_set_admin_flag ON public.profiles;
CREATE TRIGGER trg_set_admin_flag
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_flag();
