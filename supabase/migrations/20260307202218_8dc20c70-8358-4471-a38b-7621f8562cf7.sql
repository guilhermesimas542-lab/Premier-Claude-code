
CREATE TABLE financial_events (
  id bigint generated always as identity primary key,
  created_at timestamptz default now() not null,
  event_name text not null,
  email text,
  product_name text,
  product_id text,
  value_cents bigint default 0,
  currency text default 'BRL',
  order_id text,
  subscription_id text,
  is_recurring boolean default false,
  is_test boolean default false,
  raw_payload jsonb not null
);

ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read financial_events" ON financial_events
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Allow insert financial_events" ON financial_events
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_financial_events_created ON financial_events(created_at DESC);
CREATE INDEX idx_financial_events_event ON financial_events(event_name);
CREATE INDEX idx_financial_events_email ON financial_events(email);
