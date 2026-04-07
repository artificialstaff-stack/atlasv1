import { createClient } from "@/lib/supabase/server";
import { translate } from "@/i18n";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { resolveServerLocale } from "@/lib/locale-server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ManagedModulePage } from "../_components/managed-module-page";

export const metadata: Metadata = { title: "Finans" };

export default async function ClientFinancePage() {
  const supabase = await createClient();
  const locale = await resolveServerLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  const access = workspace.moduleAccess.find((item) => item.key === "finance");

  return (
    <ManagedModulePage
      userId={user.id}
      workstreamKey="ads"
      mode="locked"
      access={access ?? null}
      title={translate(locale, "portal.lockedModules.finance.title")}
      description={translate(locale, "portal.lockedModules.finance.description")}
    />
  );
}
