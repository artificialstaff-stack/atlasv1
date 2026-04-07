import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ServicesContent } from "./_components/services-content";
import { getPortalSupportOverview } from "@/lib/customer-portal";
import { getCustomerVisibleProcessTasks, getCustomerWorkspaceView } from "@/lib/customer-workspace";

export const metadata: Metadata = {
  title: "Launch Merkezi — Atlas Platform",
  description: "Kurulum paketlerini, aktif hizmetleri ve launch kapsamını takip edin.",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: tasks }, supportOverview, workspace] = await Promise.all([
    supabase
      .from("process_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("visibility", "customer")
      .order("sort_order", { ascending: true }),
    getPortalSupportOverview(user.id),
    getCustomerWorkspaceView(user.id),
  ]);

  return (
    <ServicesContent
      submissions={workspace.submittedForms.map((submission) => ({
        id: submission.id,
        form_code: submission.formCode,
        user_id: user.id,
        data: {},
        status: submission.status,
        admin_notes: submission.adminNotes,
        created_at: submission.submittedAt,
        updated_at: submission.updatedAt,
      }))}
      tasks={getCustomerVisibleProcessTasks(tasks ?? [])}
      workspace={workspace}
      supportRequestCount={supportOverview.assignedRequests.filter((request) => request.status !== "completed").length}
    />
  );
}
