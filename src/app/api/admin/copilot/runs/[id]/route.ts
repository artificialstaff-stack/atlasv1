import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { getCopilotRun } from "@/lib/admin-copilot/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const response = await getCopilotRun(id);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Run bulunamadı.") },
      { status: 404 },
    );
  }
}
