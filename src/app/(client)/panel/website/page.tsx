import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ObserverWorkstreamContent } from "@/components/portal/observer-workstream-content";

export const metadata: Metadata = {
  title: "Website",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WebsitePage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  const workstream = workspace.workstreams.find((item) => item.key === "website");

  if (!workstream) redirect("/panel/process");

  return <ObserverWorkstreamContent workstream={workstream} />;
}
