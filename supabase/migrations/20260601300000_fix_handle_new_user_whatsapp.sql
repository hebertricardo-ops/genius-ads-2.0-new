CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, avatar_url, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'whatsapp'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name       = EXCLUDED.name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    whatsapp   = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
