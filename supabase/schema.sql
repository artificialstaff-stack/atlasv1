-- =============================================================================
-- ATLAS PLATFORM — Deklaratif PostgreSQL Şeması (Tek Gerçeklik Kaynağı)
-- =============================================================================
-- Bu dosya veritabanının istenen nihai durumunu tanımlar.
-- Supabase CLI diffing ile migrasyon dosyaları otomatik üretir.
-- =============================================================================

-- UUID eklentisi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS (Kullanıcılar)
-- Supabase auth.users ile 1:1 ilişki
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50) NULL,
  phone VARCHAR(30) NULL,
  onboarding_status VARCHAR(50) NOT NULL DEFAULT 'lead'
    CHECK (onboarding_status IN ('lead', 'verifying', 'onboarding', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON public.users(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =============================================================================
-- 2. USER_ROLES (Kullanıcı Rolleri — RBAC)
-- Auth Hook bu tabloyu sorgulayarak JWT'ye user_role enjekte eder
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer', 'customer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. USER_SUBSCRIPTIONS (Abonelikler)
-- Manual-First: Ödeme havalesi → admin onayı
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_tier VARCHAR(100) NOT NULL
    CHECK (plan_tier IN ('starter', 'growth', 'professional', 'global_scale')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'cleared', 'overdue', 'cancelled')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMPTZ NOT NULL,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- =============================================================================
-- 4. CONTACT_SUBMISSIONS (İletişim / CRM Lead'ler)
-- Auth gerektirmez — landing page'den anonim form
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  company_name VARCHAR(255) NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);

-- =============================================================================
-- 5. INVITATIONS (Davet Kodları — Kapalı Devre Kayıt)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  plan_tier VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- =============================================================================
-- 6. PRODUCTS (Ürünler — Hibrit Stok Modeli)
-- stock_turkey / stock_us = denormalize cache (trigger ile güncellenir)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  hs_code VARCHAR(20) NULL,
  description TEXT NULL,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  stock_turkey INTEGER NOT NULL DEFAULT 0 CHECK (stock_turkey >= 0),
  stock_us INTEGER NOT NULL DEFAULT 0 CHECK (stock_us >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- =============================================================================
-- 7. INVENTORY_MOVEMENTS (Append-Only Envanter Defteri)
-- Sistemin denetim omurgası — salt eklemeli, silinemez, güncellenemez
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_delta INTEGER NOT NULL,
  movement_type VARCHAR(50) NOT NULL
    CHECK (movement_type IN (
      'inbound_receipt', 'order_fulfillment', 'transfer_in',
      'transfer_out', 'shrinkage', 'adjustment', 'return'
    )),
  location VARCHAR(10) NOT NULL CHECK (location IN ('TR', 'US')),
  reference_id UUID NULL,
  note TEXT NULL,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_location ON public.inventory_movements(location);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_recorded_at ON public.inventory_movements(recorded_at);

-- =============================================================================
-- 8. ORDERS (Siparişler)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NULL
    CHECK (platform IN ('amazon', 'shopify', 'walmart', 'etsy', 'direct', 'other')),
  platform_order_id VARCHAR(255) NULL,
  destination TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received', 'processing', 'packing', 'shipped',
      'delivered', 'cancelled', 'returned'
    )),
  tracking_ref VARCHAR(255) NULL,
  carrier VARCHAR(100) NULL,
  total_amount DECIMAL(10,2) NULL CHECK (total_amount >= 0),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shipped_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON public.orders(platform);

-- =============================================================================
-- 9. ORDER_ITEMS (Sipariş Kalemleri)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- =============================================================================
-- 9.5 FORM_SUBMISSIONS (Form Başvuruları)
-- Müşterilerden gelen form gönderimleri
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_code VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_correction', 'approved', 'rejected', 'completed')),
  admin_notes TEXT NULL,
  assigned_to UUID NULL REFERENCES public.users(id),
  attachments TEXT[] NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_code ON public.form_submissions(form_code);

-- =============================================================================
-- 10. PROCESS_TASKS (Süreç Görevleri / Kilometre Taşları)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.process_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  task_category VARCHAR(100) NULL
    CHECK (task_category IN ('legal', 'tax', 'customs', 'logistics', 'marketplace', 'other')),
  task_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (task_status IN ('pending', 'in_progress', 'completed', 'blocked')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT NULL,
  form_submission_id UUID NULL REFERENCES public.form_submissions(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_process_tasks_user_id ON public.process_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_status ON public.process_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_process_tasks_form_submission_id ON public.process_tasks(form_submission_id)
  WHERE form_submission_id IS NOT NULL;

-- =============================================================================
-- 11. SUPPORT_TICKETS (Destek Talepleri)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'waiting_customer', 'resolved', 'closed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_response TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- =============================================================================
-- TRIGGER: Stok Cache Güncellemesi
-- Her inventory_movements INSERT sonrası products cache'ini günceller
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_product_stock_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location = 'TR' THEN
    UPDATE public.products SET stock_turkey = (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM public.inventory_movements
      WHERE product_id = NEW.product_id AND location = 'TR'
    ), updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.location = 'US' THEN
    UPDATE public.products SET stock_us = (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM public.inventory_movements
      WHERE product_id = NEW.product_id AND location = 'US'
    ), updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock_cache
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_cache();

-- =============================================================================
-- VIEW: Hesaplanmış Stok vs. Cache Karşılaştırması
-- =============================================================================
CREATE OR REPLACE VIEW public.v_product_stock AS
SELECT
  p.id AS product_id,
  p.owner_id,
  p.name,
  p.sku,
  COALESCE(SUM(im.quantity_delta) FILTER (WHERE im.location = 'TR'), 0) AS calculated_stock_tr,
  COALESCE(SUM(im.quantity_delta) FILTER (WHERE im.location = 'US'), 0) AS calculated_stock_us,
  p.stock_turkey AS cached_stock_tr,
  p.stock_us AS cached_stock_us
FROM public.products p
LEFT JOIN public.inventory_movements im ON im.product_id = p.id
GROUP BY p.id, p.owner_id, p.name, p.sku, p.stock_turkey, p.stock_us;

-- =============================================================================
-- AUTH HOOK: Custom Access Token Hook
-- JWT token verilmeden hemen önce çalışır
-- user_roles tablosundan role okuyarak app_metadata'ya enjekte eder
-- =============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  claims := event->'claims';

  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::UUID
    AND is_active = true;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{app_metadata,user_role}', '"customer"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE;

-- Güvenlik: Sadece supabase_auth_admin çalıştırabilir
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

-- =============================================================================
-- updated_at TRIGGER: Otomatik güncelleme zamanı
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contact_submissions_updated_at
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_process_tasks_updated_at
  BEFORE UPDATE ON public.process_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =============================================================================

-- RLS'i ETKİNLEŞTİR
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- USERS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_users" ON public.users
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id
  );

CREATE POLICY "customers_update_own_profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "moderator_view_users" ON public.users
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

CREATE POLICY "viewer_view_users" ON public.users
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- USER_ROLES RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_manage_roles" ON public.user_roles
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'super_admin'
  );

CREATE POLICY "users_view_own_role" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- ─────────────────────────────────────────────
-- USER_SUBSCRIPTIONS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_manage_subscriptions" ON public.user_subscriptions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_subscription" ON public.user_subscriptions
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "moderator_view_subscriptions" ON public.user_subscriptions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

CREATE POLICY "viewer_view_subscriptions" ON public.user_subscriptions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- CONTACT_SUBMISSIONS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_manage_contacts" ON public.contact_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- Anonim form gönderimi — anon role INSERT yapabilir
CREATE POLICY "anon_insert_contact" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "moderator_manage_contacts" ON public.contact_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- INVITATIONS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_manage_invitations" ON public.invitations
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- Kayıt sırasında token doğrulama
CREATE POLICY "anon_verify_invitation" ON public.invitations
  FOR SELECT USING (
    status = 'pending'
  );

CREATE POLICY "viewer_view_invitations" ON public.invitations
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- PRODUCTS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_products" ON public.products
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_own_products" ON public.products
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND owner_id = auth.uid()
  );

CREATE POLICY "customers_insert_own_products" ON public.products
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND owner_id = auth.uid()
  );

CREATE POLICY "customers_update_own_products" ON public.products
  FOR UPDATE USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND owner_id = auth.uid()
  ) WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY "moderator_view_products" ON public.products
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- INVENTORY_MOVEMENTS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_insert_movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "admin_view_all_movements" ON public.inventory_movements
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_movements" ON public.inventory_movements
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND product_id IN (SELECT id FROM public.products WHERE owner_id = auth.uid())
  );

CREATE POLICY "moderator_manage_movements" ON public.inventory_movements
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- ORDERS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_orders" ON public.orders
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_orders" ON public.orders
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "customers_insert_own_orders" ON public.orders
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND user_id = auth.uid()
  );

CREATE POLICY "moderator_manage_orders" ON public.orders
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- ORDER_ITEMS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_order_items" ON public.order_items
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_order_items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "customers_insert_own_order_items" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "moderator_view_order_items" ON public.order_items
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- FORM_SUBMISSIONS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_form_submissions" ON public.form_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_form_submissions" ON public.form_submissions
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "customers_insert_own_form_submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "moderator_view_form_submissions" ON public.form_submissions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- PROCESS_TASKS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_tasks" ON public.process_tasks
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_tasks" ON public.process_tasks
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "customers_update_own_tasks" ON public.process_tasks
  FOR UPDATE USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "moderator_manage_tasks" ON public.process_tasks
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- SUPPORT_TICKETS RLS
-- ─────────────────────────────────────────────
CREATE POLICY "admin_full_access_tickets" ON public.support_tickets
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_manage_own_tickets" ON public.support_tickets
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND user_id = auth.uid()
  );

CREATE POLICY "moderator_manage_tickets" ON public.support_tickets
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

CREATE POLICY "viewer_view_tickets" ON public.support_tickets
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- =============================================================================
-- INVOICES (Manuel Fatura Sistemi)
-- Bire bir satış: Admin fatura oluşturur → Müşteri havale yapar → Admin onaylar
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  plan_tier VARCHAR(100) NOT NULL
    CHECK (plan_tier IN ('starter', 'growth', 'professional', 'global_scale')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'confirmed', 'overdue', 'cancelled')),
  payment_method VARCHAR(50) NULL
    CHECK (payment_method IN ('bank_transfer', 'eft', 'cash', 'other')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL,
  confirmed_by UUID NULL REFERENCES public.users(id),
  receipt_url TEXT NULL,
  notes TEXT NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_invoices" ON public.invoices
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_invoices" ON public.invoices
  FOR SELECT USING (
    auth.uid() = user_id
  );

CREATE POLICY "customers_mark_own_invoice_paid" ON public.invoices
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  ) WITH CHECK (
    auth.uid() = user_id AND status = 'paid'
  );

CREATE POLICY "moderator_view_invoices" ON public.invoices
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- Vadesi geçmiş faturaları otomatik işaretle (cron ile çağrılabilir)
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS VOID AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('customer-documents', 'customer-documents', false),
  ('admin-uploads', 'admin-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Müşteriler kendi dizinindeki dosyaları okuyabilir
CREATE POLICY "customers_read_own_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: Müşteriler kendi dizinlerine dosya yükleyebilir
CREATE POLICY "customers_upload_own_docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "customers_update_own_docs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "customers_delete_own_docs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: Adminler tüm dosyaları yönetebilir
CREATE POLICY "admin_manage_all_storage" ON storage.objects
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- =============================================================================
-- SECURITY DEFINER: Dashboard İstatistikleri
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.users),
    'active_users', (SELECT count(*) FROM public.users WHERE onboarding_status = 'active'),
    'total_orders', (SELECT count(*) FROM public.orders),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status IN ('received', 'processing')),
    'total_products', (SELECT count(*) FROM public.products WHERE is_active = true),
    'total_revenue', (SELECT COALESCE(sum(amount), 0) FROM public.invoices WHERE status = 'confirmed'),
    'pending_invoices', (SELECT count(*) FROM public.invoices WHERE status IN ('pending', 'paid')),
    'open_tickets', (SELECT count(*) FROM public.support_tickets WHERE status IN ('open', 'investigating'))
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
