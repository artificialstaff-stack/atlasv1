import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsContent } from "./_components/reports-content";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raporlar & Analitik",
};

async function ReportsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Paralel veri çekme
  const [ordersRes, productsRes, tasksRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, platform, total_amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, stock_turkey, stock_us, base_price, created_at")
      .eq("owner_id", user.id),
    supabase
      .from("process_tasks")
      .select("id, task_status, task_name, created_at, updated_at")
      .eq("user_id", user.id),
  ]);

  const orders = ordersRes.data ?? [];
  const products = productsRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  // Aylık sipariş istatistikleri
  const monthlyStats = calculateMonthlyStats(orders);

  // Platform dağılımı
  const platformStats = calculatePlatformStats(orders);

  // Durum dağılımı
  const statusStats = calculateStatusStats(orders);

  // Genel özet
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.total_amount ?? 0),
    0
  );
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalStockTR = products.reduce(
    (sum, p) => sum + ((p as Record<string, unknown>).stock_turkey as number ?? 0),
    0
  );
  const totalStockUS = products.reduce(
    (sum, p) => sum + ((p as Record<string, unknown>).stock_us as number ?? 0),
    0
  );
  const completedTasks = tasks.filter(
    (t) => (t as Record<string, unknown>).task_status === "completed"
  ).length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const deliveredOrders = orders.filter(
    (o) => o.status === "delivered"
  ).length;
  const deliveryRate =
    totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  return (
    <ReportsContent
      data={{
        totalRevenue,
        totalOrders,
        totalProducts,
        totalStockTR,
        totalStockUS,
        completedTasks,
        totalTasks: tasks.length,
        avgOrderValue,
        deliveryRate,
        monthlyStats,
        platformStats,
        statusStats,
      }}
    />
  );
}

function calculateMonthlyStats(
  orders: { created_at: string; total_amount?: number | null; status: string }[]
) {
  const months = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
  const now = new Date();
  const last6Months: {
    name: string;
    siparis: number;
    gelir: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIdx = d.getMonth();
    const year = d.getFullYear();
    const monthOrders = orders.filter((o) => {
      const od = new Date(o.created_at);
      return od.getMonth() === monthIdx && od.getFullYear() === year;
    });

    last6Months.push({
      name: months[monthIdx],
      siparis: monthOrders.length,
      gelir: monthOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
    });
  }

  return last6Months;
}

function calculatePlatformStats(
  orders: { platform?: string | null }[]
) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const p = o.platform ?? "Diğer";
    map[p] = (map[p] ?? 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function calculateStatusStats(orders: { status: string }[]) {
  const labels: Record<string, string> = {
    pending: "Beklemede",
    processing: "İşleniyor",
    packing: "Paketleniyor",
    shipped: "Kargoda",
    delivered: "Teslim Edildi",
    cancelled: "İptal",
    returned: "İade",
  };
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const key = labels[o.status] ?? o.status;
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function ClientReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsData />
    </Suspense>
  );
}
