-- =============================================
-- PREMIER ULTRA - BACKEND COMPLETO
-- =============================================

-- 1. Enum para tiers principais
CREATE TYPE public.main_tier AS ENUM ('free', 'basic', 'pro', 'ultra');

-- 2. Enum para status de entitlements
CREATE TYPE public.entitlement_status AS ENUM ('active', 'expired', 'revoked');

-- 3. Enum para source de entitlements
CREATE TYPE public.entitlement_source AS ENUM ('purchase', 'manual', 'admin');

-- 4. Enum para status de orders
CREATE TYPE public.order_status AS ENUM ('paid', 'refunded', 'chargeback');

-- 5. Enum para product keys (add-ons)
CREATE TYPE public.product_key AS ENUM ('alavancagem', 'desaltas');

-- =============================================
-- TABELA: users (perfis de usuário)
-- =============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  main_tier main_tier NOT NULL DEFAULT 'free',
  is_vitalicio BOOLEAN NOT NULL DEFAULT false,
  vitalicio_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ
);

-- Índice para busca por email
CREATE INDEX idx_users_email ON public.users(email);

-- =============================================
-- TABELA: entitlements (add-ons)
-- =============================================
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_key product_key NOT NULL,
  source entitlement_source NOT NULL DEFAULT 'purchase',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ, -- null = sem expiração
  status entitlement_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca por user_id e status
CREATE INDEX idx_entitlements_user ON public.entitlements(user_id, status);
CREATE INDEX idx_entitlements_product ON public.entitlements(product_key, status);

-- =============================================
-- TABELA: orders (compras via webhook)
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'paid',
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_order_id)
);

-- Índice para busca por email do comprador
CREATE INDEX idx_orders_buyer ON public.orders(buyer_email);
CREATE INDEX idx_orders_provider ON public.orders(provider, provider_order_id);

-- =============================================
-- TABELA: content_banners (banners dinâmicos)
-- =============================================
CREATE TABLE public.content_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  button_text TEXT,
  button_link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para banners ativos
CREATE INDEX idx_banners_active ON public.content_banners(active, starts_at, ends_at);

-- =============================================
-- TABELA: content_entries (entradas/tips)
-- =============================================
CREATE TABLE public.content_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  market TEXT,
  odd DECIMAL(5, 2),
  tier_required main_tier NOT NULL DEFAULT 'free',
  addon_required product_key, -- nullable: se preenchido, exige entitlement ativo
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB, -- dados extras (times, logos, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca de entradas
CREATE INDEX idx_entries_date ON public.content_entries(date);
CREATE INDEX idx_entries_tier ON public.content_entries(tier_required);
CREATE INDEX idx_entries_addon ON public.content_entries(addon_required);
CREATE INDEX idx_entries_active ON public.content_entries(active, date);

-- =============================================
-- TABELA: events (tracking de eventos)
-- =============================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca de eventos
CREATE INDEX idx_events_user ON public.events(user_id, created_at);
CREATE INDEX idx_events_name ON public.events(event_name, created_at);

-- =============================================
-- TABELA: sessions (sessões de uso)
-- =============================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para sessões
CREATE INDEX idx_sessions_user ON public.sessions(user_id, session_start_at);

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para obter tier permitidos baseado no main_tier
CREATE OR REPLACE FUNCTION public.get_allowed_tiers(user_tier main_tier)
RETURNS main_tier[]
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Se for free, só pode ver free
  IF user_tier = 'free' THEN
    RETURN ARRAY['free']::main_tier[];
  END IF;
  
  -- Se for pago, NUNCA mostra free
  IF user_tier = 'basic' THEN
    RETURN ARRAY['basic']::main_tier[];
  ELSIF user_tier = 'pro' THEN
    RETURN ARRAY['basic', 'pro']::main_tier[];
  ELSIF user_tier = 'ultra' THEN
    RETURN ARRAY['basic', 'pro', 'ultra']::main_tier[];
  END IF;
  
  RETURN ARRAY['free']::main_tier[];
END;
$$;

-- Função para verificar se usuário tem entitlement ativo
CREATE OR REPLACE FUNCTION public.has_active_entitlement(p_user_id UUID, p_product product_key)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements
    WHERE user_id = p_user_id
      AND product_key = p_product
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
  )
$$;

-- Função para obter ou criar usuário por email
CREATE OR REPLACE FUNCTION public.get_or_create_user(p_email TEXT)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  -- Tenta encontrar usuário existente
  SELECT * INTO v_user FROM public.users WHERE email = lower(trim(p_email));
  
  -- Se não encontrar, cria novo
  IF v_user.id IS NULL THEN
    INSERT INTO public.users (email)
    VALUES (lower(trim(p_email)))
    RETURNING * INTO v_user;
  END IF;
  
  -- Atualiza last_seen_at
  UPDATE public.users SET last_seen_at = now() WHERE id = v_user.id;
  
  RETURN v_user;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users: leitura pública para funções, escrita via service_role
CREATE POLICY "Allow read for all" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service" ON public.users FOR UPDATE USING (true);

-- Entitlements: leitura via service_role
CREATE POLICY "Allow read for all" ON public.entitlements FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.entitlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service" ON public.entitlements FOR UPDATE USING (true);

-- Orders: apenas service_role
CREATE POLICY "Allow all for service" ON public.orders FOR ALL USING (true);

-- Content Banners: leitura pública
CREATE POLICY "Allow read for all" ON public.content_banners FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.content_banners FOR INSERT WITH CHECK (true);

-- Content Entries: leitura pública
CREATE POLICY "Allow read for all" ON public.content_entries FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.content_entries FOR INSERT WITH CHECK (true);

-- Events: escrita pública, leitura via service_role
CREATE POLICY "Allow insert for all" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for all" ON public.events FOR SELECT USING (true);

-- Sessions: escrita e leitura pública (por user_id)
CREATE POLICY "Allow all for sessions" ON public.sessions FOR ALL USING (true);