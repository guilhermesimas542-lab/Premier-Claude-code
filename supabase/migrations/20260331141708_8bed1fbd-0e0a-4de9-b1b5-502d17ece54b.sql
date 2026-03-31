
-- 1. Criar tabela de feedback
CREATE TABLE user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  category text NOT NULL CHECK (category IN ('bug', 'sugestao', 'duvida', 'outro')),
  message text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'lido', 'resolvido')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Usuário pode inserir feedback próprio
CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Usuário pode ver próprio feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Admin pode ver e atualizar tudo
CREATE POLICY "Admins can select all feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all feedback"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete all feedback"
  ON user_feedback FOR DELETE
  TO authenticated
  USING (is_admin());

-- 3. Criar bucket para screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback_screenshots', 'feedback_screenshots', true);

-- 4. Policy para upload no bucket
CREATE POLICY "Authenticated users can upload feedback screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feedback_screenshots');

CREATE POLICY "Anyone can view feedback screenshots"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback_screenshots');
