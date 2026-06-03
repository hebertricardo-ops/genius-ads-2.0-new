CREATE TABLE public.api_cost_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  api_provider      TEXT NOT NULL,
  model             TEXT NOT NULL,
  operation         TEXT NOT NULL,

  prompt_tokens     INT  DEFAULT 0,
  completion_tokens INT  DEFAULT 0,
  total_tokens      INT  DEFAULT 0,

  images_count      INT  DEFAULT 0,
  image_size        TEXT,

  prompt_chars      INT  DEFAULT 0,
  ref_images_count  INT  DEFAULT 0,

  cost_usd          DECIMAL(10,6) NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_cost_log_user    ON public.api_cost_log(user_id);
CREATE INDEX idx_api_cost_log_created ON public.api_cost_log(created_at);
CREATE INDEX idx_api_cost_log_op      ON public.api_cost_log(operation);
CREATE INDEX idx_api_cost_log_user_created
  ON public.api_cost_log(user_id, created_at);
