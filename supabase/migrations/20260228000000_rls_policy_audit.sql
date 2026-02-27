-- =============================================================================
-- ATLAS PLATFORM — RLS Policy Audit & Hardening
-- Kapsamlı güvenlik denetimi: Eksik politikalar, moderator/viewer rolleri,
-- customer self-service, storage upload izinleri
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. USERS: Müşteri kendi profilini güncelleyebilsin
-- ─────────────────────────────────────────────
CREATE POLICY "customers_update_own_profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
  );

-- Moderator: Tüm kullanıcıları görebilir (yazma yok)
CREATE POLICY "moderator_view_users" ON public.users
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- Viewer: Tüm kullanıcıları görebilir (salt okunur)
CREATE POLICY "viewer_view_users" ON public.users
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- 2. PRODUCTS: Müşteri kendi ürünlerini ekleyip güncelleyebilsin
-- ─────────────────────────────────────────────
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

-- Moderator: Ürünleri görebilir
CREATE POLICY "moderator_view_products" ON public.products
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 3. ORDERS: Müşteri sipariş oluşturabilsin
-- ─────────────────────────────────────────────
CREATE POLICY "customers_insert_own_orders" ON public.orders
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND user_id = auth.uid()
  );

-- Moderator: Siparişleri görebilir & güncelleyebilir (kargo takibi vb.)
CREATE POLICY "moderator_manage_orders" ON public.orders
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 4. ORDER_ITEMS: Müşteri kendi sipariş kalemlerini ekleyebilsin
-- ─────────────────────────────────────────────
CREATE POLICY "customers_insert_own_order_items" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- Moderator: Sipariş kalemlerini görebilir
CREATE POLICY "moderator_view_order_items" ON public.order_items
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 5. INVENTORY_MOVEMENTS: Moderator envanter hareketlerini görebilir & ekleyebilir
-- ─────────────────────────────────────────────
CREATE POLICY "moderator_manage_movements" ON public.inventory_movements
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 6. PROCESS_TASKS: Müşteri kendi görevlerini güncelleyebilsin (durumu tamamla vb.)
-- ─────────────────────────────────────────────
CREATE POLICY "customers_update_own_tasks" ON public.process_tasks
  FOR UPDATE USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'customer'
    AND user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- Moderator: Görevleri görebilir & güncelleyebilir
CREATE POLICY "moderator_manage_tasks" ON public.process_tasks
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 7. SUPPORT_TICKETS: Moderator destek taleplerini yönetebilsin
-- ─────────────────────────────────────────────
CREATE POLICY "moderator_manage_tickets" ON public.support_tickets
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- Viewer: Destek taleplerini görebilir
CREATE POLICY "viewer_view_tickets" ON public.support_tickets
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- 8. INVOICES: Moderator faturaları görebilir
-- ─────────────────────────────────────────────
CREATE POLICY "moderator_view_invoices" ON public.invoices
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 9. USER_SUBSCRIPTIONS: Moderator abonelikleri görebilir
-- ─────────────────────────────────────────────
CREATE POLICY "moderator_view_subscriptions" ON public.user_subscriptions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- Viewer: Abonelikleri görebilir
CREATE POLICY "viewer_view_subscriptions" ON public.user_subscriptions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- 10. CONTACT_SUBMISSIONS: Moderator iletişim formlarını görebilir & güncelleyebilir
-- ─────────────────────────────────────────────
CREATE POLICY "moderator_manage_contacts" ON public.contact_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- ─────────────────────────────────────────────
-- 11. STORAGE: Müşteriler kendi dizinlerine dosya yükleyebilsin
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 12. INVITATIONS: Viewer görebilir
-- ─────────────────────────────────────────────
CREATE POLICY "viewer_view_invitations" ON public.invitations
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'viewer'
  );

-- ─────────────────────────────────────────────
-- 13. SECURITY DEFINER FUNCTION: İstatistik dashboard verileri
-- Service role ile çalışır, RLS bypass eder
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Sadece admin/super_admin çağırabilir
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

-- Dashboard fonksiyonunu authenticated kullanıcılara aç (kendi RLS'i var)
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
