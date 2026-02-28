import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SocialMediaContent } from "./_components/social-media-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sosyal Medya" };

export default async function ClientSocialMediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("social_media_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <SocialMediaContent accounts={accounts ?? []} />;
}
