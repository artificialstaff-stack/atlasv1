import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsContent } from "./_components/settings-content";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ayarlar",
};

async function SettingsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Kullanıcı profil bilgilerini çek
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, company_name, phone, created_at")
    .eq("id", user.id)
    .single();

  // Rol bilgisini çek
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return (
    <SettingsContent
      profile={{
        id: user.id,
        email: user.email ?? "",
        fullName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "",
        companyName: profile?.company_name ?? "",
        phone: profile?.phone ?? "",
        role: roleData?.role ?? "customer",
        createdAt: profile?.created_at ?? user.created_at,
      }}
    />
  );
}

export default function ClientSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}
