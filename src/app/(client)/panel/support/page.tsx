import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPortalSupportOverview } from "@/lib/customer-portal";
import { buildPortalSupportUnlockContext } from "@/lib/customer-portal/support-intent";
import { SupportContent } from "./_components/support-content";

export const metadata: Metadata = {
  title: "Destek Merkezi",
  description: "Atlas ekibinin sizden istedigi formlari ve gonderim gecmisinizi yonetin.",
};

interface SupportPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const overview = await getPortalSupportOverview(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const unlockContext = buildPortalSupportUnlockContext(resolvedSearchParams);

  return <SupportContent overview={{ ...overview, unlockContext }} />;
}
