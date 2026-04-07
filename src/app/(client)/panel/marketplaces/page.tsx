import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ManagedModulePage } from "../_components/managed-module-page";
import { MarketplacesContent } from "./_components/marketplaces-content";

export const metadata: Metadata = { title: "Pazaryerlerim" };

export default async function ClientMarketplacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [workspace, { data: accounts }] = await Promise.all([
    getCustomerWorkspaceView(user.id),
    supabase.from("marketplace_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const access = workspace.moduleAccess.find((item) => item.key === "marketplaces");

  if (access?.visibility === "active") {
    return (
      <MarketplacesContent
        workspace={workspace}
        accounts={(accounts ?? []).map((account) => ({
          id: account.id,
          platform: account.platform,
          store_name: account.store_name,
          store_url: account.store_url,
          seller_id: account.seller_id,
          status: account.status,
          seller_rating: account.seller_rating,
          total_listings: account.total_listings,
          total_sales: account.total_sales,
          monthly_revenue: account.monthly_revenue,
          api_connected: account.api_connected,
          notes: account.admin_notes ?? account.notes,
          created_at: account.created_at,
        }))}
      />
    );
  }

  return (
    <ManagedModulePage
      userId={user.id}
      workstreamKey="marketplaces"
      mode="locked"
      access={access ?? null}
    />
  );
}
