import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./_components/dashboard-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Paralel veri çekme
  const [productsRes, ordersRes, tasksRes] = await Promise.all([
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
      .eq("user_id", user.id),
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
      }}
    />
  );
}
