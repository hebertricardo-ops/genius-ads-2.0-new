-- Remover a constraint existente em original_creative_id
ALTER TABLE public.creative_edits
  DROP CONSTRAINT IF EXISTS creative_edits_original_creative_id_fkey;

-- Recriar com ON DELETE CASCADE
-- Ao deletar o criativo original, todas as edições são deletadas junto
ALTER TABLE public.creative_edits
  ADD CONSTRAINT creative_edits_original_creative_id_fkey
  FOREIGN KEY (original_creative_id)
  REFERENCES public.generated_creatives(id)
  ON DELETE CASCADE;

-- Remover a constraint existente em parent_edit_id
ALTER TABLE public.creative_edits
  DROP CONSTRAINT IF EXISTS creative_edits_parent_edit_id_fkey;

-- Recriar com ON DELETE CASCADE (edições de edições também são removidas)
ALTER TABLE public.creative_edits
  ADD CONSTRAINT creative_edits_parent_edit_id_fkey
  FOREIGN KEY (parent_edit_id)
  REFERENCES public.creative_edits(id)
  ON DELETE CASCADE;
