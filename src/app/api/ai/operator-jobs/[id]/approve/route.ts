import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveCopilotOperatorJob } from "@/lib/admin-copilot/service";
import { getOperatorCompanionIdentity } from "@/lib/admin-copilot/operator-auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const companionIdentity = getOperatorCompanionIdentity(request);
  const admin = companionIdentity ? { id: companionIdentity.id, email: companionIdentity.label } : await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const response = await resolveCopilotOperatorJob({
    jobId: id,
    action: "approve",
    decidedBy: admin.id,
    decidedByEmail: admin.email,
    note: typeof body.note === "string" ? body.note : undefined,
  });

  return NextResponse.json(response);
}
