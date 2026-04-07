import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { getCopilotConversations } from "@/lib/admin-copilot/service";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getCopilotConversations({
      requesterUserId: admin.id,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Sohbet listesi yüklenemedi.") },
      { status: 500 },
    );
  }
}
