import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { PerformanceSummaryContent } from "@/components/portal/performance-summary-content";
import { ManagedModulePage } from "../_components/managed-module-page";

export const metadata: Metadata = {
  title: "Raporlar",
};

export default async function ClientReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  const access = workspace.moduleAccess.find((item) => item.key === "reports");

  if (access?.visibility !== "active") {
    return (
      <ManagedModulePage
        userId={user.id}
      workstreamKey="marketplaces"
      mode="locked"
      access={access ?? null}
      title="Raporlar"
      description="Performans raporlari ilk canli aktivite olustuktan sonra bu modülde görünür."
    />
  );
}

  return (
    <PerformanceSummaryContent
      workspace={workspace}
      title="Raporlar"
      eyebrow="Performans Ozeti"
      description="Satis, gorev ve operasyon metriklerini Atlas yorumuyla birlikte sade bir yonetim ozeti olarak izleyin."
    />
  );
}
