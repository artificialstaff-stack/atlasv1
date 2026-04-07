import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardContent } from "./_components/admin-dashboard-content";
import { PageSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function DashboardData() {
  const supabase = await createClient();

  // KPI verilerini paralel çek
  const [
    { count: customerCount },
    { count: activeOrderCount },
    { count: leadCount },
    { count: pendingTaskCount },
    { count: inProgressTaskCount },
    { count: blockedTaskCount },
    { count: submittedCount },
    { count: underReviewCount },
    { count: needsCorrectionCount },
    { data: lowStockProducts },
    { data: recentOrders },
    { data: recentLeads },
    { data: dailyTasks },
    { data: recentSubmissions },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer")
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["received", "processing", "packing"]),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "contacted"]),
    supabase
      .from("process_tasks")
      .select("*", { count: "exact", head: true })
      .eq("task_status", "pending"),
    supabase
      .from("process_tasks")
      .select("*", { count: "exact", head: true })
      .eq("task_status", "in_progress"),
    supabase
      .from("process_tasks")
      .select("*", { count: "exact", head: true })
      .eq("task_status", "blocked"),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "under_review"),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "needs_correction"),
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
    supabase
      .from("process_tasks")
      .select("id, task_name, task_category, task_status, updated_at")
      .in("task_status", ["pending", "in_progress", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("form_submissions")
      .select("id, form_code, status, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  return (
    <AdminDashboardContent
      data={{
        customerCount: customerCount ?? 0,
        activeOrderCount: activeOrderCount ?? 0,
        leadCount: leadCount ?? 0,
        taskCounts: {
          pending: pendingTaskCount ?? 0,
          inProgress: inProgressTaskCount ?? 0,
          blocked: blockedTaskCount ?? 0,
        },
        submissionCounts: {
          submitted: submittedCount ?? 0,
          underReview: underReviewCount ?? 0,
          needsCorrection: needsCorrectionCount ?? 0,
        },
        lowStockProducts: lowStockProducts ?? [],
        recentOrders: recentOrders ?? [],
        recentLeads: recentLeads ?? [],
        dailyTasks: dailyTasks ?? [],
        recentSubmissions: recentSubmissions ?? [],
      }}
    />
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
