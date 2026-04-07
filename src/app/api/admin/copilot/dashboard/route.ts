import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCopilotError } from "@/lib/admin-copilot/errors";
import { getCopilotDashboard } from "@/lib/admin-copilot/service";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;
    const response = await getCopilotDashboard(customerId);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: formatCopilotError(error, "Dashboard yüklenemedi.") },
      { status: 500 },
    );
  }
}
