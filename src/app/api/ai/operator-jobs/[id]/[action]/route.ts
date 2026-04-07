import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { CopilotOperatorJobStatus } from "@/lib/admin-copilot/types";
import { getOperatorCompanionIdentity } from "@/lib/admin-copilot/operator-auth";
import { updateOperatorJobStatus } from "@/lib/admin-copilot/operator-jobs";

const ACTION_STATUS_MAP: Record<string, CopilotOperatorJobStatus> = {
  approve: "approved",
  pause: "paused",
  takeover: "taken_over",
  reject: "rejected",
  complete: "completed",
  fail: "failed",
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; action: string }> },
) {
  const companionIdentity = getOperatorCompanionIdentity(request);
  const admin = companionIdentity
    ? { id: companionIdentity.id, email: companionIdentity.label }
    : await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await context.params;
  const nextStatus = ACTION_STATUS_MAP[action];

  if (!nextStatus) {
    return NextResponse.json({ error: "Unsupported operator action" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { note?: unknown };
  const note = typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : null;

  try {
    const item = await updateOperatorJobStatus({
      jobId: id,
      status: nextStatus,
      decidedBy: admin.id,
      decisionNote: note ?? undefined,
      metadata: {
        lastAction: action,
        actedBy: companionIdentity ? "companion" : "admin",
        actorLabel: admin.email,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operator isi guncellenemedi." },
      { status: 404 },
    );
  }
}
