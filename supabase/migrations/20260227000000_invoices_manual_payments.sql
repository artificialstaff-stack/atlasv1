-- =============================================================================
-- ATLAS PLATFORM — Fatura (Invoice) Sistemi Migration
-- Manuel ödeme modeli: Admin fatura oluşturur → Müşteri havale yapar → Admin onaylar
-- =============================================================================

-- ─── INVOICES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  plan_tier text NOT NULL
    CHECK (plan_tier IN ('starter','growth','professional','global_scale')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','confirmed','overdue','cancelled')),
  payment_method text
    CHECK (payment_method IN ('bank_transfer','eft','cash','other')),
  due_date timestamptz NOT NULL,
  paid_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.users(id),
  receipt_url text,
  notes text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- updated_at trigger
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admin tüm faturaları yönetebilir
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','super_admin')
        AND ur.is_active = true
    )
  );

-- Müşteri kendi faturalarını görebilir
CREATE POLICY "invoices_customer_select" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Müşteri kendi bekleyen faturasını "paid" yapabilir (dekont gönderme)
CREATE POLICY "invoices_customer_mark_paid" ON public.invoices
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  ) WITH CHECK (
    auth.uid() = user_id AND status = 'paid'
  );

-- ─── user_subscriptions'a payment_status 'cleared' ekle (mevcut check constraint güncelle) ───
-- Not: Mevcut constraint zaten 'cleared' içeriyorsa bu adım atlanabilir.

-- ─── Vadesi geçmiş faturaları otomatik işaretle (opsiyonel cron) ───
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending'
    AND due_date < now();
END;
$$;
