import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAllowedPortalFormCodes } from "@/lib/customer-portal";
import { buildPortalSupportUnlockContext } from "@/lib/customer-portal/support-intent";
import { getFormByCode } from "@/lib/forms";
import { FormFillContent } from "@/app/(client)/panel/support/forms/[code]/_components/form-fill-content";

interface FormPageProps {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  const { code } = await params;
  const formDef = getFormByCode(code.toUpperCase());
  return {
    title: formDef ? `${formDef.code} - ${formDef.title}` : "Form",
    description: formDef?.description ?? "Atlas destek formu",
  };
}

export default async function FormFillPage({ params, searchParams }: FormPageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const formDef = getFormByCode(normalizedCode) ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allowedFormCodes = await getAllowedPortalFormCodes(user.id);
  const canAccess = allowedFormCodes.includes(normalizedCode);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const unlockContext = buildPortalSupportUnlockContext(resolvedSearchParams);

  return (
    <FormFillContent
      code={normalizedCode}
      formDef={formDef}
      canAccess={canAccess}
      unlockContext={unlockContext}
    />
  );
}
