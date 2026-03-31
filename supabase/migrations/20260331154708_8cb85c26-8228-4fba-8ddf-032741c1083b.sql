
CREATE TABLE admin_last_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  section text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_email, section)
);

ALTER TABLE admin_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own last_seen"
  ON admin_last_seen FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public admin can manage last_seen"
  ON admin_last_seen FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
