import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cancelInvoice } from "@/lib/payments";

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
    const success = await cancelInvoice(id, "Admin tarafından reddedildi");
    if (!success) {
      return NextResponse.json({ error: "Fatura iptal edilirken hata olustu." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/invoices/cancel] Unexpected error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fatura iptali sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
  }
}
