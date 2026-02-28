import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ServicesContent } from "./_components/services-content";

export const metadata: Metadata = {
  title: "Hizmetlerim — Atlas Platform",
  description: "Başvuru durumlarını ve aktif hizmetlerinizi takip edin.",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch form submissions for this user
  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch process tasks for this user
  const { data: tasks } = await supabase
    .from("process_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  return (
    <ServicesContent
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      submissions={(submissions ?? []) as any[]}
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      tasks={(tasks ?? []) as any[]}
    />
  );
}
