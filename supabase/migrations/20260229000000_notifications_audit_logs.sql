-- =============================================================================
-- ATLAS PLATFORM — Audit Logs Table + Notifications Realtime
-- =============================================================================

-- Mevcut notifications tablosu için Realtime yayını etkinleştir
-- (Tablo zaten var, sadece realtime ekle)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── AUDIT LOGS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS — sadece admin erişimi
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_audit_logs" ON public.audit_logs
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- Insert policy: authenticated kullanıcılar log oluşturabilir
CREATE POLICY "authenticated_insert_audit" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
