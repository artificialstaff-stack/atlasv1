import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import {
  getCopilotConversationMemory,
  updateCopilotConversationMemory,
} from "@/lib/admin-copilot/service";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const memory = await getCopilotConversationMemory({
      requesterUserId: admin.id,
      conversationId: id,
    });

    return NextResponse.json({ memory });
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Sohbet hafızası yüklenemedi.") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const memory = await updateCopilotConversationMemory({
      requesterUserId: admin.id,
      conversationId: id,
      actor: {
        id: admin.id,
        email: admin.email,
      },
      title: typeof body.title === "string" ? body.title : null,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      workingGoal: typeof body.workingGoal === "string" ? body.workingGoal : null,
      handoffNote: typeof body.handoffNote === "string" ? body.handoffNote : null,
      handoffChecklist: Array.isArray(body.handoffChecklist)
        ? body.handoffChecklist.filter((item: unknown): item is string => typeof item === "string")
        : null,
      workspaceAction:
        body.workspaceAction === "claim"
        || body.workspaceAction === "release"
        || body.workspaceAction === "handoff_ready"
        || body.workspaceAction === "shared"
          ? body.workspaceAction
          : null,
    });

    return NextResponse.json({ memory });
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Sohbet hafızası güncellenemedi.") },
      { status: 500 },
    );
  }
}
