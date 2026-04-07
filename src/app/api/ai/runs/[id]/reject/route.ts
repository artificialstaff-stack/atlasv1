import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { resolveCopilotApproval } from "@/lib/admin-copilot/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { note?: string };
    const response = await resolveCopilotApproval({
      approvalId: id,
      decision: "rejected",
      decidedBy: admin.id,
      note: body.note,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Approval reddedilemedi.") },
      { status: 500 },
    );
  }
}
