import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ManagedModulePage } from "../_components/managed-module-page";
import { CompaniesContent } from "./_components/companies-content";

export const metadata: Metadata = { title: "Sirketlerim (LLC)" };

export default async function ClientCompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [workspace, { data: companies }] = await Promise.all([
    getCustomerWorkspaceView(user.id),
    supabase.from("customer_companies").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const access = workspace.moduleAccess.find((item) => item.key === "companies");

  if (access?.visibility === "active") {
    return (
      <CompaniesContent
        companies={(companies ?? []).map((company) => ({
          id: company.id,
          company_name: company.company_name,
          company_type: company.company_type,
          state_of_formation: company.state_of_formation,
          ein_number: company.ein_number,
          formation_date: company.formation_date,
          status: company.status,
          registered_agent_name: company.registered_agent_name,
          bank_name: company.bank_name,
          bank_account_status: company.bank_account_status,
          business_city: company.business_city,
          business_state: company.business_state,
          company_email: company.company_email,
          company_phone: company.company_phone,
          website: company.website,
          notes: company.admin_notes,
          created_at: company.created_at,
        }))}
      />
    );
  }

  return (
    <ManagedModulePage
      userId={user.id}
      workstreamKey="company_setup"
      mode="locked"
      access={access ?? null}
    />
  );
}
