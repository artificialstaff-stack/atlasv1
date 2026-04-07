import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { getCopilotRun } from "@/lib/admin-copilot/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const response = await getCopilotRun(params.id);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Run yüklenemedi.") },
      { status: 500 },
    );
  }
}
