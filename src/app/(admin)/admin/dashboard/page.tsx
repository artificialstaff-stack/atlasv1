import { createClient } from "@/lib/supabase/server";
import { AdminDashboardContent } from "./_components/admin-dashboard-content";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // KPI verilerini paralel çek
  const [
    { count: customerCount },
    { count: activeOrderCount },
    { count: leadCount },
    { data: lowStockProducts },
    { data: recentOrders },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["received", "processing", "packing"]),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "contacted"]),
    supabase
      .from("products")
      .select("id, name, sku, stock_us, owner_id")
      .lt("stock_us", 10)
      .eq("is_active", true)
      .order("stock_us", { ascending: true })
      .limit(5),
    supabase
      .from("orders")
      .select("id, platform, status, total_amount, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("contact_submissions")
      .select("id, name, email, company_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <AdminDashboardContent
      data={{
        customerCount: customerCount ?? 0,
        activeOrderCount: activeOrderCount ?? 0,
        leadCount: leadCount ?? 0,
        lowStockProducts: lowStockProducts ?? [],
        recentOrders: recentOrders ?? [],
        recentLeads: recentLeads ?? [],
      }}
    />
  );
}
