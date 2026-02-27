-- =============================================================================
-- ATLAS PLATFORM — Tüm Eksik & Bug Fix SQL'leri
-- Supabase Dashboard > SQL Editor'de TEK SEFERDE çalıştır
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FORM_SUBMISSIONS TABLOSU (Zaten oluşturduysan atla — IF NOT EXISTS güvenli)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft', 'submitted', 'under_review',
      'needs_correction', 'approved', 'rejected', 'completed'
    )),
  admin_notes TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_code ON public.form_submissions(form_code);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON public.form_submissions(created_at DESC);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Önceki policy'ler varsa sil, temiz oluştur
DROP POLICY IF EXISTS "users_read_own_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "users_insert_own_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "users_update_draft_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "admin_all_submissions" ON public.form_submissions;

-- Müşteri kendi gönderimlerini görebilir
CREATE POLICY "users_read_own_submissions" ON public.form_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Müşteri yeni gönderim oluşturabilir
CREATE POLICY "users_insert_own_submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Müşteri draft gönderimini güncelleyebilir (submitted'a geçiş dahil)
CREATE POLICY "users_update_draft_submissions" ON public.form_submissions
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'submitted'));

-- Admin/Super Admin tüm gönderimler üzerinde tam yetki
CREATE POLICY "admin_all_submissions" ON public.form_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- Moderator: Form gönderimlerini görebilir ve güncelleyebilir
CREATE POLICY "moderator_manage_submissions" ON public.form_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator'
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_form_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_form_submissions_updated_at ON public.form_submissions;
CREATE TRIGGER set_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_form_submissions_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BUG FIX: state_transitions admin policy — 'profiles' tablosu yok, düzelt
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all transitions" ON public.state_transitions;
CREATE POLICY "Admins can view all transitions" ON public.state_transitions
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BUG FIX: agent_action_log admin policy — super_admin eksik, düzelt
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all action logs" ON public.agent_action_log;
CREATE POLICY "Admins can view all action logs" ON public.agent_action_log
  FOR SELECT USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can update any action logs" ON public.agent_action_log;
CREATE POLICY "Admins can update any action logs" ON public.agent_action_log
  FOR UPDATE USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. EKSİK: notifications tablosu — admin göremiyordu, ekle
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_notifications" ON public.notifications;
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. EKSİK: agent_conversations — admin göremiyordu, ekle
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_conversations" ON public.agent_conversations;
CREATE POLICY "admin_all_conversations" ON public.agent_conversations
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EKSİK: billing_records — admin göremiyordu, ekle
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_billing" ON public.billing_records;
CREATE POLICY "admin_all_billing" ON public.billing_records
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. EKSİK: ai_reports — admin göremiyordu, ekle
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_ai_reports" ON public.ai_reports;
CREATE POLICY "admin_all_ai_reports" ON public.ai_reports
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET: customer-documents (yoksa oluştur)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Admin tüm dosyalara erişebilsin
DROP POLICY IF EXISTS "admin_all_storage" ON storage.objects;
CREATE POLICY "admin_all_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'customer-documents'
    AND (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- Müşteriler kendi dosyalarını okuyabilsin
DROP POLICY IF EXISTS "customers_read_own_docs" ON storage.objects;
CREATE POLICY "customers_read_own_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Realtime: form_submissions değişikliklerini canlı yayınla
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
EXCEPTION WHEN others THEN
  -- zaten varsa atla
  NULL;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BITTI! Tüm tablolar, policy'ler ve bug fix'ler uygulandı.
-- ─────────────────────────────────────────────────────────────────────────────
