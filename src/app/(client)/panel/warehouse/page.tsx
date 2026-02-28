import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WarehouseContent } from "./_components/warehouse-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Depom" };

export default async function ClientWarehousePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("warehouse_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <WarehouseContent items={items ?? []} />;
}
