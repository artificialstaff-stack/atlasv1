import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOperatorCompanionIdentity, hasOperatorCompanionAccess } from "@/lib/admin-copilot/operator-auth";
import { listOperatorCompanions, upsertOperatorCompanionHeartbeat } from "@/lib/admin-copilot/operator-jobs";

export async function GET(request: NextRequest) {
  const companionIdentity = getOperatorCompanionIdentity(request);
  const admin = companionIdentity ? { id: companionIdentity.id } : await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companions = await listOperatorCompanions();
  return NextResponse.json({
    items: companionIdentity
      ? companions.filter((companion) => companion.id === companionIdentity.id)
      : companions,
  });
}

export async function POST(request: NextRequest) {
  if (!hasOperatorCompanionAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = getOperatorCompanionIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const companion = await upsertOperatorCompanionHeartbeat({
    companionId: identity.id,
    label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : identity.label,
    platform: typeof body.platform === "string" ? body.platform : null,
    version: typeof body.version === "string" ? body.version : null,
    capabilities: Array.isArray(body.capabilities)
      ? body.capabilities.filter((value: unknown): value is string => typeof value === "string")
      : [],
    metadata: body && typeof body === "object" ? body : {},
  });

  return NextResponse.json({
    companion,
  });
}
