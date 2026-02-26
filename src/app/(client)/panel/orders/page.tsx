import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersContent } from "./_components/orders-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Siparişlerim",
};

export default async function ClientOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <OrdersContent orders={orders ?? []} />;
}
