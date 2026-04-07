import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./_components/dashboard-content";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { getPortalSupportOverview } from "@/lib/customer-portal";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function DashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Paralel veri çekme
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [productsRes, ordersRes, tasksRes, trendOrdersRes, supportOverview, workspace] = await Promise.all([
    supabase
      .from("products")
      .select("id, stock_turkey, stock_us", { count: "exact" })
      .eq("owner_id", user.id),
    supabase
      .from("orders")
      .select("id, status, platform_order_id", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("process_tasks")
      .select("id, task_status", { count: "exact" })
      .eq("user_id", user.id)
      .eq("visibility", "customer"),
    supabase
      .from("orders")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sixMonthsAgo.toISOString()),
    getPortalSupportOverview(user.id),
    getCustomerWorkspaceView(user.id),
  ]);

  const totalProducts = productsRes.count ?? 0;
  const totalOrders = ordersRes.count ?? 0;
  const totalTasks = tasksRes.count ?? 0;
  const completedTasks =
    tasksRes.data?.filter((t) => t.task_status === "completed").length ?? 0;
  const completionPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeOrders =
    ordersRes.data?.filter(
      (o) => !["delivered", "cancelled", "returned"].includes(o.status)
    ).length ?? 0;

  const totalStockTR =
    productsRes.data?.reduce((sum, p) => sum + (p.stock_turkey ?? 0), 0) ?? 0;
  const totalStockUS =
    productsRes.data?.reduce((sum, p) => sum + (p.stock_us ?? 0), 0) ?? 0;

  // Build monthly trend data from real orders
  const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] });
  }
  const ordersByMonth = new Map<string, number>();
  for (const order of trendOrdersRes.data ?? []) {
    const d = new Date(order.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    ordersByMonth.set(key, (ordersByMonth.get(key) ?? 0) + 1);
  }
  const monthlyTrends = months.map((m) => ({
    name: m.label,
    siparis: ordersByMonth.get(`${m.year}-${m.month}`) ?? 0,
    stok: totalStockTR + totalStockUS,
  }));

  return (
    <DashboardContent
      data={{
        totalProducts,
        totalStockTR,
        totalStockUS,
        activeOrders,
        totalOrders,
        completionPct,
        completedTasks,
        totalTasks,
        recentOrders: ordersRes.data ?? [],
        monthlyTrends,
        openSupportRequests: supportOverview.assignedRequests.filter((request) => request.status !== "completed").length,
        workspace,
      }}
    />
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
