ALTER TABLE public.generated_creatives
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'generated';

-- Valores: 'generated' | 'adapt_format' | 'edit_ia'
COMMENT ON COLUMN public.generated_creatives.source IS
  'Origem do criativo: generated=geração normal, adapt_format=Adaptar Formato, edit_ia=salvo pelo Editor IA';
