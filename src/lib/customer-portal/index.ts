/**
 * ─── Atlas Platform — Customer Portal Service ───
 * Public-facing order tracking & customer self-service.
 */

import { createClient } from "@/lib/supabase/server";
export * from "./types";
export * from "./requests";

export interface CustomerOrderView {
  id: string;
  platform_order_id: string | null;
  status: string;
  destination: string;
  tracking_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInvoiceView {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

/** Fetch orders visible to the current customer */
export async function getCustomerOrders(): Promise<CustomerOrderView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("orders")
    .select("id, platform_order_id, status, destination, tracking_ref, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as CustomerOrderView[]) ?? [];
}

/** Fetch invoices visible to the current customer */
export async function getCustomerInvoices(): Promise<CustomerInvoiceView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, currency, status, due_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as CustomerInvoiceView[]) ?? [];
}

/** Public order tracking by tracking number (no auth required) */
export async function trackOrder(
  trackingNumber: string
): Promise<{ status: string; destination: string; updated_at: string } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("status, destination, updated_at")
    .eq("tracking_ref", trackingNumber)
    .single();

  return data;
}
