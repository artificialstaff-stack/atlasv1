-- =============================================================================
-- ATLAS PLATFORM — process_tasks ↔ form_submissions Bağlantısı
-- Form onaylandığında otomatik görev oluşturmak için FK ilişkisi
-- =============================================================================

-- process_tasks tablosuna form_submission_id sütunu ekle
ALTER TABLE public.process_tasks
  ADD COLUMN IF NOT EXISTS form_submission_id UUID REFERENCES public.form_submissions(id) ON DELETE SET NULL;

-- Performans için index
CREATE INDEX IF NOT EXISTS idx_process_tasks_form_submission_id
  ON public.process_tasks(form_submission_id)
  WHERE form_submission_id IS NOT NULL;

-- form_submissions tablosuna eksik index'ler
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_code ON public.form_submissions(form_code);
