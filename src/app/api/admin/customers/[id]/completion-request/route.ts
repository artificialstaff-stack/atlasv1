import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getCustomerCompletionFields,
  requestCustomerCompletionDetails,
} from "@/lib/workflows/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const missingFields = await getCustomerCompletionFields(id);
    return NextResponse.json({ success: true, missingFields });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Eksik alanlar okunamadi." },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await requestCustomerCompletionDetails({
      userId: id,
      actorUserId: admin.id,
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
      { error: error instanceof Error ? error.message : "Talep olusturulamadi." },
      { status: 500 }
    );
  }
}
