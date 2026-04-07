import { NextRequest, NextResponse } from "next/server";
import { getOperatorCompanionIdentity, hasOperatorCompanionAccess } from "@/lib/admin-copilot/operator-auth";
import { claimNextOperatorJob } from "@/lib/admin-copilot/operator-jobs";

export async function POST(request: NextRequest) {
  if (!hasOperatorCompanionAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = getOperatorCompanionIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await claimNextOperatorJob({
    companionId: identity.id,
    label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : identity.label,
    platform: typeof body.platform === "string" ? body.platform : null,
    version: typeof body.version === "string" ? body.version : null,
    capabilities: Array.isArray(body.capabilities)
      ? body.capabilities.filter((value: unknown): value is string => typeof value === "string")
      : [],
  });

  return NextResponse.json(result);
}
