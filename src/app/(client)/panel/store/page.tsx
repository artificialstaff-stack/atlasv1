import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildStoreExperienceViewModel, getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ManagedModulePage } from "../_components/managed-module-page";
import { StoreContent } from "./_components/store-content";

export const metadata: Metadata = {
  title: "Magaza",
  description: "Kanal secimi ve magaza readiness modulu",
};

export default async function StorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [workspace, { data: accounts }] = await Promise.all([
    getCustomerWorkspaceView(user.id),
    supabase.from("marketplace_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const access = workspace.moduleAccess.find((item) => item.key === "store");

  if (access?.visibility !== "active") {
    return (
      <ManagedModulePage
        userId={user.id}
        workstreamKey="marketplaces"
      mode="locked"
      access={access ?? null}
      title="Magaza"
      description="Kanal secimi ve magaza aktivasyonu bu modulde ilerler."
    />
  );
}

  const experience = buildStoreExperienceViewModel({
    workspace,
    accounts: (accounts ?? []).map((account) => ({
      id: account.id,
      platform: account.platform,
      store_name: account.store_name,
      status: account.status,
      store_url: account.store_url,
      seller_id: account.seller_id,
    })),
  });

  return <StoreContent experience={experience} />;
}
