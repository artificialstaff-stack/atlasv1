import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsContent } from "./_components/documents-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Belgelerim",
};

export default async function ClientDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Supabase Storage'dan dosyaları listele
  const { data: files } = await supabase.storage
    .from("customer-documents")
    .list(user.id, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  const directFiles =
    files
      ?.filter((f) => f.id !== null)
      .map((f) => ({
        name: f.name,
        size: f.metadata?.size ?? 0,
        createdAt: f.created_at ?? "",
        url: supabase.storage
          .from("customer-documents")
          .getPublicUrl(`${user.id}/${f.name}`).data.publicUrl,
      })) ?? [];

  return <DocumentsContent files={directFiles} />;
}
