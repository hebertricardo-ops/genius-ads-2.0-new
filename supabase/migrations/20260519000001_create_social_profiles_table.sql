CREATE TABLE public.social_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  upload_post_username  TEXT NOT NULL,
  connected_platforms   TEXT[] DEFAULT '{}',
  is_connected          BOOLEAN DEFAULT false,
  last_connected_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa apenas seu perfil social"
  ON public.social_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_social_profiles_user_id
  ON public.social_profiles(user_id);

CREATE TRIGGER on_social_profiles_updated
  BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
