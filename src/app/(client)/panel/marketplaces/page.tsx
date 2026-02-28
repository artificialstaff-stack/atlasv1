import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MarketplacesContent } from "./_components/marketplaces-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pazaryerlerim" };

export default async function ClientMarketplacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("marketplace_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <MarketplacesContent accounts={accounts ?? []} />;
}
