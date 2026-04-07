import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getFormByCode } from "@/lib/forms";
import { requestCustomerFormAction } from "@/lib/workflows/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        formCode?: string;
        message?: string;
      }
    | null;

  const formCode = body?.formCode?.trim().toUpperCase();
  const customMessage = body?.message?.trim();

  if (!formCode) {
    return NextResponse.json({ error: "formCode zorunludur." }, { status: 400 });
  }

  const form = getFormByCode(formCode);
  if (!form || !form.active) {
    return NextResponse.json({ error: "Istenen form aktif degil veya bulunamadi." }, { status: 404 });
  }

  const summary =
    customMessage && customMessage.length > 0
      ? customMessage
      : `${form.title} icin Atlas ekibi sizden bilgi veya onay bekliyor.`;

  const notes = [
    `Atlas ekibi ${form.code} formunu doldurmanizi istedi.`,
    "",
    summary,
    "",
    `Form kodu: ${form.code}`,
  ].join("\n");

  try {
    const result = await requestCustomerFormAction({
      userId: id,
      actorUserId: admin.id,
      formCode: form.code,
      title: form.title,
      summary,
      notes,
      customerTaskName: `${form.code} musteri istegi`,
      adminTaskName: `${form.code} musteri form takibi`,
      adminTaskNotes: `${form.code} formu musterinin paneline atandi. Gonderim ve sonraki admin aksiyonu izleniyor.`,
      notificationTitle: `${form.code} formu sizden istendi`,
      notificationBody: `${summary}\n\n"${form.title}" formunu doldurarak Atlas ekibine ilerleme saglayabilirsiniz.`,
      eventTitle: `${form.code} form istegi gonderildi`,
    });

    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
    revalidatePath("/admin/workflows");
    revalidatePath("/panel/dashboard");
    revalidatePath("/panel/process");
    revalidatePath("/panel/services");
    revalidatePath("/panel/support");

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form istegi olusturulamadi." },
      { status: 500 }
    );
  }
}
