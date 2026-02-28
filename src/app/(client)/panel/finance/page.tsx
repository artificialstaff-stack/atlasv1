import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FinanceContent } from "./_components/finance-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Finans" };

export default async function ClientFinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: records } = await supabase
    .from("financial_records")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  return <FinanceContent records={records ?? []} />;
}
