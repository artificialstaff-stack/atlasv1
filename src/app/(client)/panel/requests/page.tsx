import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { RequestHubContent } from "@/components/portal/request-hub-content";

export const metadata: Metadata = {
  title: "Requests & Forms",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RequestsPage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getCustomerWorkspaceView(user.id);
  return <RequestHubContent workspace={workspace} />;
}
