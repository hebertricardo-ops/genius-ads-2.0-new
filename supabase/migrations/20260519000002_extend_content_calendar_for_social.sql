ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS upload_post_request_id TEXT,
  ADD COLUMN IF NOT EXISTS image_url              TEXT,
  ADD COLUMN IF NOT EXISTS caption                TEXT;

COMMENT ON COLUMN public.content_calendar.creative_id
  IS 'ID do criativo gerado vinculado a este post';
COMMENT ON COLUMN public.content_calendar.carousel_request_id
  IS 'ID do carrossel gerado vinculado a este post';
COMMENT ON COLUMN public.content_calendar.upload_post_request_id
  IS 'request_id retornado pelo Upload-Post para rastrear status';
COMMENT ON COLUMN public.content_calendar.image_url
  IS 'URL pública da imagem a ser publicada';
COMMENT ON COLUMN public.content_calendar.caption
  IS 'Legenda do post (copy escolhida pelo usuário)';
