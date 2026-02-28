import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompaniesContent } from "./_components/companies-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Şirketlerim (LLC)" };

export default async function ClientCompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companies } = await supabase
    .from("customer_companies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <CompaniesContent companies={companies ?? []} />;
}
