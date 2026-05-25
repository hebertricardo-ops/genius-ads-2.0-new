CREATE TABLE public.creative_edits (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id              UUID REFERENCES public.brands(id),

  original_creative_id  UUID REFERENCES public.generated_creatives(id) NOT NULL,
  parent_edit_id        UUID REFERENCES public.creative_edits(id),

  source_image_url      TEXT NOT NULL,
  result_image_url      TEXT,

  edit_element          TEXT,
  -- valores: headline | body | cta | background |
  --          font_style | color_palette | image | free

  edit_instruction      TEXT NOT NULL,
  edit_prompt_raw       TEXT,

  status                TEXT DEFAULT 'processing',
  -- valores: processing | completed | failed

  credits_used          INT DEFAULT 5,
  error_message         TEXT,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creative_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa apenas suas edições"
  ON public.creative_edits FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_creative_edits_original
  ON public.creative_edits(original_creative_id);

CREATE INDEX idx_creative_edits_user
  ON public.creative_edits(user_id);

CREATE INDEX idx_creative_edits_parent
  ON public.creative_edits(parent_edit_id);

CREATE INDEX idx_creative_edits_brand
  ON public.creative_edits(brand_id);

CREATE TRIGGER on_creative_edits_updated
  BEFORE UPDATE ON public.creative_edits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
