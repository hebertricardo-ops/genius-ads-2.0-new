CREATE POLICY "Users can update own creatives"
  ON public.generated_creatives
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
