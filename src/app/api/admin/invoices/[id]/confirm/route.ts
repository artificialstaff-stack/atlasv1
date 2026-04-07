import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { confirmPayment } from "@/lib/payments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const success = await confirmPayment(id, admin.id);
    if (!success) {
      return NextResponse.json(
        { error: "Odeme onayi sirasinda subscription veya invoice finalize edilemedi." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/invoices/confirm] Unexpected error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odeme onayi sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
  }
}
