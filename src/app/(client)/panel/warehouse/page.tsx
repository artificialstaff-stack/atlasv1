import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ManagedModulePage } from "../_components/managed-module-page";

export const metadata: Metadata = { title: "Depom" };

export default async function ClientWarehousePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  const access = workspace.moduleAccess.find((item) => item.key === "warehouse");

  return (
    <ManagedModulePage
      userId={user.id}
      workstreamKey="fulfillment"
      mode={access?.visibility === "active" ? "observer" : "locked"}
      access={access ?? null}
    />
  );
}
