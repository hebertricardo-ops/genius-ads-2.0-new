ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

COMMENT ON COLUMN public.content_calendar.scheduled_time
  IS 'Hora de publicação — armazenada separadamente pois scheduled_date é DATE';
