-- =============================================================================
-- ATLAS PLATFORM — Tüm Eksik Tablolar, Bug Fix'ler & RLS Policy'leri
-- Supabase Dashboard > SQL Editor'de TEK SEFERDE çalıştır
-- Tüm CREATE TABLE IF NOT EXISTS — güvenli, tekrar çalıştırılabilir
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- BÖLÜM A: EKSİK TABLOLARI OLUŞTUR (IF NOT EXISTS — güvenli)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── A1. state_machine_status ENUM + process_tasks sm_status sütunu ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'state_machine_status') THEN
    CREATE TYPE state_machine_status AS ENUM (
      'idle','awaiting_input','processing','review','approved','rejected','completed','failed'
    );
  END IF;
END;
$$;

ALTER TABLE public.process_tasks
  ADD COLUMN IF NOT EXISTS sm_status state_machine_status DEFAULT 'idle';

-- ─── A2. state_transitions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.process_tasks(id) ON DELETE CASCADE,
  from_state state_machine_status NOT NULL,
  to_state state_machine_status NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_state_transitions_task_id ON public.state_transitions(task_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_created_at ON public.state_transitions(created_at);
ALTER TABLE public.state_transitions ENABLE ROW LEVEL SECURITY;

-- ─── A3. agent_action_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_role TEXT NOT NULL CHECK (agent_role IN ('orchestrator','compliance','logistics','auditor')),
  action_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','executed','failed')),
  risk_level SMALLINT NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 3),
  autonomy_level SMALLINT NOT NULL DEFAULT 0 CHECK (autonomy_level BETWEEN 0 AND 3),
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_action_log_user_id ON public.agent_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_log_status ON public.agent_action_log(status);
CREATE INDEX IF NOT EXISTS idx_agent_action_log_created_at ON public.agent_action_log(created_at DESC);
ALTER TABLE public.agent_action_log ENABLE ROW LEVEL SECURITY;

-- ─── A4. notifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error','system')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','push','sms')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ─── A5. agent_conversations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_session ON public.agent_conversations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON public.agent_conversations(user_id, created_at DESC);
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- ─── A6. billing_records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled','trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_user ON public.billing_records(user_id);
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

-- ─── A7. ai_reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('sales','inventory','compliance','performance','custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','completed','failed')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user ON public.ai_reports(user_id, created_at DESC);
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- ─── A8. audit_logs ─────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── A9. invoices (eğer yoksa) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL
    CHECK (plan_tier IN ('starter','growth','professional','global_scale')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','confirmed','overdue','cancelled')),
  payment_method TEXT
    CHECK (payment_method IN ('bank_transfer','eft','cash','other')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.users(id),
  receipt_url TEXT,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ─── A10. form_submissions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft','submitted','under_review',
      'needs_correction','approved','rejected','completed'
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- BÖLÜM B: UPDATED_AT TRIGGERs
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Her tablo için trigger (varsa sil, yeniden oluştur)
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','contact_submissions','products','orders','process_tasks',
    'support_tickets','invoices','billing_records','form_submissions'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- BÖLÜM C: RLS POLİÇELERİ (DROP IF EXISTS + CREATE — idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── C1. state_transitions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own task transitions" ON public.state_transitions;
CREATE POLICY "Users can view own task transitions" ON public.state_transitions
  FOR SELECT USING (task_id IN (SELECT id FROM public.process_tasks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transitions" ON public.state_transitions;
CREATE POLICY "Admins can view all transitions" ON public.state_transitions
  FOR SELECT USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C2. agent_action_log ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own action logs" ON public.agent_action_log;
CREATE POLICY "Users can view own action logs" ON public.agent_action_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending actions" ON public.agent_action_log;
CREATE POLICY "Users can update own pending actions" ON public.agent_action_log
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('approved','rejected'));

DROP POLICY IF EXISTS "Service role can insert action logs" ON public.agent_action_log;
CREATE POLICY "Service role can insert action logs" ON public.agent_action_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all action logs" ON public.agent_action_log;
CREATE POLICY "Admins can view all action logs" ON public.agent_action_log
  FOR SELECT USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

DROP POLICY IF EXISTS "Admins can update any action logs" ON public.agent_action_log;
CREATE POLICY "Admins can update any action logs" ON public.agent_action_log
  FOR UPDATE USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C3. notifications ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_notifications" ON public.notifications;
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C4. agent_conversations ────────────────────────────────────────────────
DROP POLICY IF EXISTS "agent_conv_own" ON public.agent_conversations;
CREATE POLICY "agent_conv_own" ON public.agent_conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_conversations" ON public.agent_conversations;
CREATE POLICY "admin_all_conversations" ON public.agent_conversations
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C5. billing_records ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "billing_own_select" ON public.billing_records;
CREATE POLICY "billing_own_select" ON public.billing_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_billing" ON public.billing_records;
CREATE POLICY "admin_all_billing" ON public.billing_records
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C6. ai_reports ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_reports_own" ON public.ai_reports;
CREATE POLICY "ai_reports_own" ON public.ai_reports
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_ai_reports" ON public.ai_reports;
CREATE POLICY "admin_all_ai_reports" ON public.ai_reports
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

-- ─── C7. audit_logs ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_all_audit_logs" ON public.audit_logs
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

DROP POLICY IF EXISTS "authenticated_insert_audit" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── C8. invoices ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_admin_all" ON public.invoices;
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin') AND ur.is_active = true)
  );

DROP POLICY IF EXISTS "invoices_customer_select" ON public.invoices;
CREATE POLICY "invoices_customer_select" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "invoices_customer_mark_paid" ON public.invoices;
CREATE POLICY "invoices_customer_mark_paid" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'paid');

-- ─── C9. form_submissions ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read_own_submissions" ON public.form_submissions;
CREATE POLICY "users_read_own_submissions" ON public.form_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_submissions" ON public.form_submissions;
CREATE POLICY "users_insert_own_submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_draft_submissions" ON public.form_submissions;
CREATE POLICY "users_update_draft_submissions" ON public.form_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','submitted'));

DROP POLICY IF EXISTS "admin_all_submissions" ON public.form_submissions;
CREATE POLICY "admin_all_submissions" ON public.form_submissions
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));

DROP POLICY IF EXISTS "moderator_manage_submissions" ON public.form_submissions;
CREATE POLICY "moderator_manage_submissions" ON public.form_submissions
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') = 'moderator');


-- ═══════════════════════════════════════════════════════════════════════════════
-- BÖLÜM D: STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin_all_storage" ON storage.objects;
CREATE POLICY "admin_all_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'customer-documents'
    AND (SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin')
  );

DROP POLICY IF EXISTS "customers_read_own_docs" ON storage.objects;
CREATE POLICY "customers_read_own_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- BÖLÜM E: REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
EXCEPTION WHEN others THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN others THEN NULL;
END; $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- BİTTİ! Tüm tablolar, indexler, RLS policy'leri ve trigger'lar uygulandı.
-- ═══════════════════════════════════════════════════════════════════════════════
