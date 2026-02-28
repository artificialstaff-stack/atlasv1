import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdvertisingContent } from "./_components/advertising-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reklamlarım" };

export default async function ClientAdvertisingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: campaigns } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <AdvertisingContent campaigns={campaigns ?? []} />;
}
