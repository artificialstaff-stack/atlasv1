import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { submitUnifiedRun } from "@/lib/ai/orchestrator/service";
import type { CopilotMode, CopilotScope } from "@/lib/admin-copilot/types";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      commandText?: string;
      mode?: CopilotMode;
      scope?: CopilotScope;
      projectId?: string | null;
      skillIds?: string[];
      requestId?: string | null;
      conversationId?: string | null;
    };

    if (!body.commandText?.trim()) {
      return NextResponse.json({ error: "Mesaj gerekli." }, { status: 400 });
    }

    const response = await submitUnifiedRun({
      requesterUserId: admin.id,
      mode: body.mode ?? "agent",
      commandText: body.commandText.trim(),
      scope: body.scope ?? { type: "global" },
      projectId: body.projectId ?? null,
      skillIds: Array.isArray(body.skillIds)
        ? body.skillIds.filter((value): value is string => typeof value === "string")
        : [],
      requestId: typeof body.requestId === "string" ? body.requestId : null,
      conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
      requestCookies: request.cookies.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      })),
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Mesaj işlenemedi.") },
      { status: 500 },
    );
  }
}
