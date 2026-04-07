import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersContent } from "./_components/orders-content";
import type { Metadata } from "next";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ManagedModulePage } from "../_components/managed-module-page";

export const metadata: Metadata = {
  title: "Siparişlerim",
};

export default async function ClientOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [workspace, { data: orders }] = await Promise.all([
    getCustomerWorkspaceView(user.id),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const access = workspace.moduleAccess.find((item) => item.key === "orders");

  if (access?.visibility !== "active") {
    return (
      <ManagedModulePage
        userId={user.id}
      workstreamKey="fulfillment"
      mode="locked"
      access={access ?? null}
      title="Siparislerim"
      description="Siparis ve teslim operasyonu kanal canliya gectikten sonra bu modülde görünür."
    />
  );
}

  return <OrdersContent orders={orders ?? []} />;
}
