import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { PerformanceSummaryContent } from "@/components/portal/performance-summary-content";

export const metadata: Metadata = {
  title: "Performance",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PerformancePage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  return <PerformanceSummaryContent workspace={workspace} />;
}
