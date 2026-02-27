/**
 * ─── Atlas Stripe Payment Integration ───
 * Stripe SDK wrapper — subscription & one-time payment.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  priceId: string;
  mode: "subscription" | "payment";
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  url: string | null;
  sessionId: string;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planName: string;
}

export interface InvoiceInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  pdfUrl: string | null;
}

// Plan tier → Stripe Price ID mapping
export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "price_starter",
  professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? "price_pro",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? "price_enterprise",
} as const;

export type PlanTier = keyof typeof STRIPE_PRICES;

/**
 * Stripe SDK yoksa veya key yoksa stub döner.
 * Runtime'da Stripe SDK dinamik import edilir (bundle boyutu optimizasyonu).
 */
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const { default: Stripe } = await import("stripe");
  return new Stripe(key);
}

/**
 * Checkout session oluştur
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutResult> {
  const stripe = await getStripe();

  if (!stripe) {
    console.log("[stripe:dev] Checkout session stub:", params);
    return { url: "/pricing?demo=true", sessionId: `stub_${Date.now()}` };
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: params.email,
    mode: params.mode,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/panel/dashboard?checkout=success`,
    cancel_url: params.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    metadata: { userId: params.userId },
    subscription_data: params.mode === "subscription" ? { metadata: { userId: params.userId } } : undefined,
  });

  return { url: session.url, sessionId: session.id };
}

/**
 * Portal session — fatura/subscription yönetimi
 */
export async function createPortalSession(customerId: string): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return "/panel/dashboard";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/panel/dashboard`,
  });

  return session.url;
}

/**
 * Subscription bilgileri al
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceId: sub.items.data[0]?.price.id ?? "",
      planName: (sub.items.data[0]?.price.nickname ?? "Plan") as string,
    };
  } catch {
    return null;
  }
}

/**
 * Müşteri faturaları
 */
export async function getInvoices(customerId: string, limit = 12): Promise<InvoiceInfo[]> {
  const stripe = await getStripe();
  if (!stripe) return [];

  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit });
    return invoices.data.map((inv: any) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status ?? "unknown",
      created: new Date(inv.created * 1000).toISOString(),
      pdfUrl: inv.invoice_pdf,
    }));
  } catch {
    return [];
  }
}
