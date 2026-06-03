ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

UPDATE public.profiles
SET is_admin = true
WHERE email = 'hebertricardo@gmail.com';
