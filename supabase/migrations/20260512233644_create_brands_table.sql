-- Tabela de marcas
CREATE TABLE public.brands (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  benefits        TEXT[],
  differentials   TEXT,
  objective       TEXT,

  -- Público-Alvo
  audience_age_min    INT,
  audience_age_max    INT,
  audience_gender     TEXT,
  audience_interests  TEXT[],
  audience_pains      TEXT[],
  audience_desires    TEXT[],

  -- Estilo Visual
  logo_url            TEXT,
  color_primary       TEXT,
  color_secondary     TEXT,
  color_accent        TEXT,
  visual_style        TEXT,
  visual_style_custom TEXT,
  reference_image_url TEXT,

  -- Identidade
  tone_of_voice       TEXT[],
  formality_level     TEXT,

  -- Origem
  source              TEXT,
  source_url          TEXT,

  -- Controle
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa apenas suas marcas"
  ON public.brands FOR ALL
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_brands_updated
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index para buscas por user_id
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
