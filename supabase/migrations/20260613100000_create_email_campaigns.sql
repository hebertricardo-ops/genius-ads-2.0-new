CREATE TABLE public.email_campaigns (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id         UUID REFERENCES auth.users(id),
  channel          TEXT NOT NULL,
  template_key     TEXT NOT NULL,
  subject          TEXT,
  message          TEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.email_campaign_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID REFERENCES public.email_campaigns(id),
  user_id       UUID REFERENCES auth.users(id),
  user_email    TEXT,
  user_name     TEXT,
  user_whatsapp TEXT,
  channel       TEXT NOT NULL,
  status        TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_logs_campaign ON public.email_campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_user     ON public.email_campaign_logs(user_id);
