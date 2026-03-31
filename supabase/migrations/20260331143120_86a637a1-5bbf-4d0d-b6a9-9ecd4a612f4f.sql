
DROP POLICY IF EXISTS "Users can insert own feedback" ON user_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON user_feedback;

CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = user_feedback.user_id 
      AND email = user_feedback.email
    )
  );

CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = user_feedback.user_id 
      AND email = user_feedback.email
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload feedback screenshots" ON storage.objects;

CREATE POLICY "Anyone can upload feedback screenshots"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'feedback_screenshots');
