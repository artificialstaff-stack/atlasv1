-- =============================================================================
-- ATLAS PLATFORM — Form Submissions (ABD Tarzı Numaralı Form Sistemi)
-- =============================================================================

-- ─── FORM SUBMISSIONS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code TEXT NOT NULL,                        -- ATL-101, ATL-201, vb.
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',               -- Form verileri
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft',
      'submitted',
      'under_review',
      'needs_correction',
      'approved',
      'rejected',
      'completed'
    )),
  admin_notes TEXT,                               -- Admin tarafından müşteriye not
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',                -- Dosya URL'leri
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX idx_form_submissions_form_code ON public.form_submissions(form_code);
CREATE INDEX idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX idx_form_submissions_created_at ON public.form_submissions(created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Müşteriler kendi gönderimlerini görebilir
CREATE POLICY "users_read_own_submissions" ON public.form_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Müşteriler yeni gönderim oluşturabilir
CREATE POLICY "users_insert_own_submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Müşteriler sadece draft durumundaki gönderimlerini güncelleyebilir
CREATE POLICY "users_update_draft_submissions" ON public.form_submissions
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'draft'
  );

-- Admin/Super Admin tüm gönderimler üzerinde tam yetki
CREATE POLICY "admin_all_submissions" ON public.form_submissions
  FOR ALL USING (
    (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin', 'super_admin')
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_form_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_form_submissions_updated_at();
