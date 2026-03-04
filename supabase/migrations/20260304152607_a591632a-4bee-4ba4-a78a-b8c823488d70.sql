
-- 1. Tabela webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at      timestamptz NOT NULL DEFAULT now(),
  provider         text NOT NULL,
  event_name       text,
  buyer_email      text,
  unique_key       text,
  processed_ok     boolean NOT NULL DEFAULT false,
  error_message    text,
  raw_payload      jsonb,
  is_test          boolean DEFAULT false,
  provider_event_id text
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook_logs" ON webhook_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow insert for service webhook_logs" ON webhook_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service webhook_logs" ON webhook_logs FOR UPDATE USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_logs_unique_key_ok
  ON webhook_logs (unique_key)
  WHERE processed_ok = true;

-- 2. Tabela products_catalog
CREATE TABLE IF NOT EXISTS products_catalog (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider             text NOT NULL,
  provider_product_id  text NOT NULL,
  product_name         text NOT NULL,
  tier                 text,
  entitlement_key      text,
  active               boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (provider, provider_product_id)
);

ALTER TABLE products_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage products_catalog" ON products_catalog FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow read for all products_catalog" ON products_catalog FOR SELECT USING (true);

-- 3. Alterar tabela orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS provider_event_id  text,
  ADD COLUMN IF NOT EXISTS event_name         text,
  ADD COLUMN IF NOT EXISTS buyer_name         text,
  ADD COLUMN IF NOT EXISTS product_ids        text[],
  ADD COLUMN IF NOT EXISTS product_names      text[],
  ADD COLUMN IF NOT EXISTS unique_key         text,
  ADD COLUMN IF NOT EXISTS is_test            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add unique constraint on unique_key for orders (only if not null)
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_key_idx ON orders (unique_key) WHERE unique_key IS NOT NULL;

-- 4. Add unique constraint on entitlements for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_user_product_unique ON entitlements (user_id, product_key) WHERE status = 'active';
