-- =============================================================================
-- Migration: Notifications + Agent Conversations + Billing + Indexes
-- =============================================================================

-- ─── Notifications Table ───
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push', 'sms')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ─── Agent Conversations (Memory) ───
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_session 
  ON public.agent_conversations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_conv_user 
  ON public.agent_conversations(user_id, created_at DESC);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conv_own" ON public.agent_conversations
  FOR ALL USING (auth.uid() = user_id);

-- ─── Billing Records ───
CREATE TABLE IF NOT EXISTS public.billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_user ON public.billing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe ON public.billing_records(stripe_customer_id);

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_own_select" ON public.billing_records
  FOR SELECT USING (auth.uid() = user_id);

-- ─── AI Reports ───
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('sales', 'inventory', 'compliance', 'performance', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user ON public.ai_reports(user_id, created_at DESC);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_reports_own" ON public.ai_reports
  FOR ALL USING (auth.uid() = user_id);

-- ─── Performance Indexes (Step 15: DB Optimization) ───

-- Orders: en sık sorgulanan alanlar
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON public.orders(platform) WHERE platform IS NOT NULL;

-- Products: aktif ürünler + SKU araması
CREATE INDEX IF NOT EXISTS idx_products_owner_active ON public.products(owner_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_hs_code ON public.products(hs_code) WHERE hs_code IS NOT NULL;

-- Inventory: hareketler tarihe göre
CREATE INDEX IF NOT EXISTS idx_inventory_product_date ON public.inventory_movements(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON public.inventory_movements(movement_type);

-- Support tickets: kullanıcı + status
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON public.support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.support_tickets(priority, status);

-- Contact submissions: status filtreleme
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contact_submissions(status, created_at DESC);

-- Process tasks: kullanıcı + status
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.process_tasks(user_id, task_status);

-- Users: email araması
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- User subscriptions: aktif planlar
CREATE INDEX IF NOT EXISTS idx_subs_user_status ON public.user_subscriptions(user_id, payment_status);
