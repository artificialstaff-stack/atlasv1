import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductsContent } from "./_components/products-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürünlerim",
};

export default async function ClientProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return <ProductsContent products={products ?? []} />;
}
