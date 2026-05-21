-- 1. Adicionar brand_id
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id)
    ON DELETE CASCADE;

-- 2. Remover UNIQUE constraint antiga (por user_id)
ALTER TABLE public.social_profiles
  DROP CONSTRAINT IF EXISTS social_profiles_user_id_key;

-- 3. Nova UNIQUE constraint: um perfil por marca por usuário
ALTER TABLE public.social_profiles
  ADD CONSTRAINT social_profiles_user_brand_unique
    UNIQUE (user_id, brand_id);

-- 4. Index para buscas por brand_id
CREATE INDEX IF NOT EXISTS idx_social_profiles_brand_id
  ON public.social_profiles(brand_id);

-- 5. Deletar registros órfãos sem brand_id (dados de teste)
DELETE FROM public.social_profiles WHERE brand_id IS NULL;

-- 6. Tornar brand_id obrigatório após limpar órfãos
ALTER TABLE public.social_profiles
  ALTER COLUMN brand_id SET NOT NULL;