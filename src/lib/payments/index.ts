/**
 * ─── Atlas Manuel Ödeme Sistemi ───
 *
 * Bire bir satış modeli: Admin fatura oluşturur, müşteri havale/EFT ile öder.
 * Admin onayı sonrası abonelik aktif edilir.
 *
 * Akış:
 * 1. Admin → Fatura oluştur (plan + tutar + vade)
 * 2. Müşteri → Faturayı görür, havale yapar
 * 3. Müşteri → "Ödeme Yaptım" butonuna basar (dekont yükler)
 * 4. Admin → Ödemeyi kontrol eder, onaylar/reddeder
 * 5. Onay → user_subscriptions güncellenir
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanTierDefinition, type PlanTier } from "./catalog";
export {
  getMarketplaceChannelOfferings,
  getStoreAddonOfferByKey,
  getStoreAddonOfferings,
  getStoreBundleOfferByKey,
  getStoreBundleOfferings,
  getStoreMarketplaceOfferByKey,
  getStoreOfferByQuery,
  getStoreOperationalNotes,
  isMarketplaceChannelKey,
  PAYMENT_CATALOG as PLAN_TIERS,
  getBillingCatalogSections,
  getPlanTierAmount,
  getPlanTierDefinition,
  type BillingCadence,
  type BillingPackage,
  type MarketplaceChannelKey,
  type MarketplaceChannelOffering,
  type OperationalFeeNote,
  type PlanTier,
  type StoreAddonOffer,
  type StoreAddonClusterKey,
  type StoreBundleOffer,
  type StoreMarketplaceOffer,
  type StoreOffer,
  type StoreOfferCategory,
  type StoreOfferMotionPreset,
  type StoreOfferQuery,
  type StoreOfferSurfaceStyle,
  type StoreOfferTone,
} from "./catalog";

export type InvoiceStatus = "pending" | "paid" | "confirmed" | "overdue" | "cancelled";
export type PaymentMethod = "bank_transfer" | "eft" | "cash" | "other";

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  plan_tier: PlanTier;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  payment_method: PaymentMethod | null;
  due_date: string;
  paid_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  receipt_url: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Yeni fatura numarası oluştur: ATL-2026-00001
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ATL-${year}-${rand}`;
}

/**
 * Admin: Yeni fatura oluştur
 */
export async function createInvoice(params: {
  userId: string;
  planTier: PlanTier;
  amount: number;
  currency?: string;
  dueDate: string;
  notes?: string;
}): Promise<Invoice | null> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("invoices")
    .insert({
      user_id: params.userId,
      invoice_number: generateInvoiceNumber(),
      plan_tier: params.planTier,
      amount: params.amount,
      currency: params.currency ?? "USD",
      status: "pending",
      due_date: params.dueDate,
      notes: params.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("[payments] Invoice create error:", error);
    return null;
  }

  return data;
}

/**
 * Müşteri: Faturalarımı getir
 */
export async function getMyInvoices(
  userId: string,
  page = 1,
  pageSize = 20
): Promise<{ invoices: Invoice[]; total: number }> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const from = (page - 1) * pageSize;

  const { data, count, error } = await db
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("[payments] Fetch invoices error:", error);
    return { invoices: [], total: 0 };
  }

  return { invoices: data ?? [], total: count ?? 0 };
}

/**
 * Admin: Tüm faturaları getir
 */
export async function getAllInvoices(
  page = 1,
  pageSize = 50,
  statusFilter?: InvoiceStatus
): Promise<{ invoices: Invoice[]; total: number }> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("invoices")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[payments] Fetch all invoices error:", error);
    return { invoices: [], total: 0 };
  }

  return { invoices: data ?? [], total: count ?? 0 };
}

/**
 * Müşteri: Ödeme yaptım bildir (dekont URL ile)
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  userId: string,
  paymentMethod: PaymentMethod,
  receiptUrl?: string
): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("invoices")
    .update({
      status: "paid",
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
      receipt_url: receiptUrl ?? null,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("[payments] Mark paid error:", error);
    return false;
  }

  return true;
}

/**
 * Admin: Ödemeyi onayla → subscription aktif et
 */
export async function confirmPayment(
  invoiceId: string,
  adminId: string,
  adminNotes?: string
): Promise<boolean> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: invoice, error: invoiceError } = await db
    .from("invoices")
    .select()
    .eq("id", invoiceId)
    .eq("status", "paid")
    .single();

  if (invoiceError || !invoice) {
    console.error("[payments] Confirm payment error:", invoiceError);
    return false;
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const startedAt = new Date().toISOString();
  const plan = getPlanTierDefinition(invoice.plan_tier);
  const subscriptionPayload = {
    user_id: invoice.user_id,
    plan_tier: invoice.plan_tier,
    payment_status: "cleared",
    amount: invoice.amount,
    started_at: startedAt,
    valid_until: validUntil.toISOString(),
    notes:
      plan.cadence === "one_time"
        ? `One-time package ${invoice.invoice_number} confirmed`
        : `Invoice #${invoice.invoice_number} confirmed`,
  };

  const { data: existingSubscription, error: existingSubError } = await db
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", invoice.user_id)
    .maybeSingle();

  if (existingSubError) {
    console.error("[payments] Existing subscription lookup error:", existingSubError);
    return false;
  }

  const { error: subError } = existingSubscription?.id
    ? await db
      .from("user_subscriptions")
      .update(subscriptionPayload)
      .eq("id", existingSubscription.id)
    : await db
      .from("user_subscriptions")
      .insert(subscriptionPayload);

  if (subError) {
    console.error("[payments] Subscription upsert error:", subError);
    return false;
  }

  const { error: confirmError } = await db
    .from("invoices")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: adminId,
      admin_notes: adminNotes,
    })
    .eq("id", invoiceId)
    .eq("status", "paid");

  if (confirmError) {
    console.error("[payments] Invoice confirm finalize error:", confirmError);
    return false;
  }

  return true;
}

/**
 * Admin: Faturayı iptal et
 */
export async function cancelInvoice(
  invoiceId: string,
  adminNotes?: string
): Promise<boolean> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("invoices")
    .update({
      status: "cancelled",
      admin_notes: adminNotes,
    })
    .eq("id", invoiceId);

  if (error) {
    console.error("[payments] Cancel invoice error:", error);
    return false;
  }

  return true;
}

/**
 * Banka bilgileri — fatura sayfasında gösterilir
 */
export const BANK_DETAILS = {
  bankName: "Atlas Global LLC — Chase Bank",
  accountName: "Atlas Platform LLC",
  routingNumber: "021000021",
  accountNumber: "XXXX-XXXX-XXXX",
  swiftCode: "CHASUS33",
  iban: "—",
  reference: "Fatura numaranızı açıklama alanına yazın",
} as const;
