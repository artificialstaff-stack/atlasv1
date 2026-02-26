-- =============================================================================
-- ATLAS PLATFORM — Tam veritabanı şeması
-- =============================================================================

-- ─── USERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text NOT NULL,
  tax_id text,
  phone text,
  onboarding_status text NOT NULL DEFAULT 'lead'
    CHECK (onboarding_status IN ('lead','verifying','onboarding','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── USER ROLES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('super_admin','admin','moderator','viewer','customer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ─── USER SUBSCRIPTIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_tier text NOT NULL
    CHECK (plan_tier IN ('starter','growth','professional','global_scale')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','cleared','overdue','cancelled')),
  amount numeric(12,2) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  notes text
);

-- ─── CONTACT SUBMISSIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── INVITATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  plan_tier text NOT NULL
    CHECK (plan_tier IN ('starter','growth','professional','global_scale')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  hs_code text,
  description text,
  base_price numeric(12,2) NOT NULL,
  stock_turkey integer NOT NULL DEFAULT 0,
  stock_us integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── INVENTORY MOVEMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_delta integer NOT NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN ('inbound_receipt','order_fulfillment','transfer_in','transfer_out','shrinkage','adjustment','return')),
  location text NOT NULL CHECK (location IN ('TR','US')),
  reference_id text,
  note text,
  recorded_by uuid NOT NULL REFERENCES public.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- ─── ORDERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('amazon','shopify','walmart','etsy','direct','other')),
  platform_order_id text,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','packing','shipped','delivered','cancelled','returned')),
  tracking_ref text,
  carrier text,
  total_amount numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  shipped_at timestamptz,
  delivered_at timestamptz
);

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL
);

-- ─── PROCESS TASKS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_category text CHECK (task_category IN ('legal','tax','customs','logistics','marketplace','other')),
  task_status text NOT NULL DEFAULT 'pending'
    CHECK (task_status IN ('pending','in_progress','completed','blocked')),
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── SUPPORT TICKETS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','waiting_customer','resolved','closed')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ─── VIEW: Product Stock ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_product_stock AS
SELECT
  p.id AS product_id,
  p.owner_id,
  p.name,
  p.sku,
  COALESCE(
    (SELECT SUM(im.quantity_delta) FROM public.inventory_movements im
     WHERE im.product_id = p.id AND im.location = 'TR'), 0
  )::integer AS calculated_stock_tr,
  COALESCE(
    (SELECT SUM(im.quantity_delta) FROM public.inventory_movements im
     WHERE im.product_id = p.id AND im.location = 'US'), 0
  )::integer AS calculated_stock_us,
  p.stock_turkey AS cached_stock_tr,
  p.stock_us AS cached_stock_us
FROM public.products p;

-- ─── CUSTOM ACCESS TOKEN HOOK ─────────────────────────────────────────────
-- Kullanıcı rolünü JWT'ye ekler
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  claims := event->'claims';

  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid
    AND is_active = true
  LIMIT 1;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('user_role', user_role)
    );
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"customer"');
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) || '{"user_role":"customer"}'::jsonb
    );
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- ─── Fonksiyona supabase_auth_admin erişimi ───────────────────────────────
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ─── UPDATED_AT TRIGGERs ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','contact_submissions','products','orders','process_tasks','support_tickets'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────
-- Tüm tablolarda RLS aktif
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLİÇELERİ ──────────────────────────────────────────────────────

-- Service role her şeyi okuyabilir (server-side actions)
-- Anon key ile marketing formu (contact_submissions) eklenebilir

-- users: Kullanıcı kendi satırını görebilir, admin herkesi görebilir
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles: Admin görebilir/ekleyebilir, kullanıcı kendi rolünü görebilir
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- user_subscriptions: Kullanıcı kendi aboneliğini görebilir, admin herkesinkini
CREATE POLICY "subscriptions_select" ON public.user_subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "subscriptions_admin_manage" ON public.user_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- contact_submissions: Herkes ekleyebilir (anon), admin okuyabilir
CREATE POLICY "contacts_anon_insert" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "contacts_admin_select" ON public.contact_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "contacts_admin_update" ON public.contact_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- invitations: Admin yönetir
CREATE POLICY "invitations_admin_all" ON public.invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- invitations: Anonim kullanıcılar token ile okuyabilir (kayıt sırasında)
CREATE POLICY "invitations_anon_select" ON public.invitations
  FOR SELECT USING (true);

-- products: Sahip kendi ürünlerini görebilir, admin herkesinkini
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "products_owner_manage" ON public.products
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "products_admin_manage" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- inventory_movements: Sahip/admin görebilir, admin ekleyebilir
CREATE POLICY "inventory_select" ON public.inventory_movements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "inventory_admin_insert" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- orders: Kullanıcı kendininkileri, admin herkesinkini
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "orders_admin_manage" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- order_items: orders tablosuyla aynı erişim
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)))
  );

CREATE POLICY "order_items_admin_manage" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- process_tasks: Kullanıcı kendininkileri, admin herkesinkini
CREATE POLICY "tasks_select" ON public.process_tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "tasks_user_manage" ON public.process_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tasks_admin_manage" ON public.process_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- support_tickets: Kullanıcı kendininkileri, admin herkesinkini
CREATE POLICY "tickets_select" ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin','moderator','viewer') AND ur.is_active = true)
  );

CREATE POLICY "tickets_user_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_user_update" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tickets_admin_manage" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

-- ─── İNDEXLER ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory_movements(location);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_user_id ON public.process_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
