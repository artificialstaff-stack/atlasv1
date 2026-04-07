import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProcessContent } from "./_components/process-content";
import type { Metadata } from "next";
import { getCustomerVisibleProcessTasks, getCustomerWorkspaceView } from "@/lib/customer-workspace";

export const metadata: Metadata = {
  title: "Süreç Takibi",
};

export default async function ProcessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: tasks }, workspace] = await Promise.all([
    supabase
      .from("process_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("visibility", "customer")
      .order("sort_order", { ascending: true }),
    getCustomerWorkspaceView(user.id),
  ]);

  return <ProcessContent tasks={getCustomerVisibleProcessTasks(tasks ?? [])} workspace={workspace} />;
}
