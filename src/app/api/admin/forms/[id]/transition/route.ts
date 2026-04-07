import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { transitionFormSubmission } from "@/lib/workflows/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    adminNotes?: string | null;
  };

  if (!body.status) {
    return NextResponse.json({ error: "Durum zorunlu." }, { status: 400 });
  }

  try {
    const submission = await transitionFormSubmission({
      submissionId: id,
      nextStatus: body.status as Parameters<typeof transitionFormSubmission>[0]["nextStatus"],
      adminNotes: body.adminNotes ?? null,
      actorUserId: admin.id,
    });

    revalidatePath("/admin/forms");
    revalidatePath("/admin/workflows");
    revalidatePath(`/admin/customers/${submission.user_id}`);
    revalidatePath("/panel/dashboard");
    revalidatePath("/panel/process");
    revalidatePath("/panel/services");
    revalidatePath(`/panel/support/submissions/${submission.id}`);

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Durum guncellenemedi." },
      { status: 500 }
    );
  }
}
