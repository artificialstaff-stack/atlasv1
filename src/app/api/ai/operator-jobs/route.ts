import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOperatorCompanionIdentity } from "@/lib/admin-copilot/operator-auth";
import {
  getOperatorAllowlistRules,
  listOperatorCompanions,
  listOperatorJobs,
} from "@/lib/admin-copilot/operator-jobs";

export async function GET(request: Request) {
  const companionIdentity = getOperatorCompanionIdentity(request);
  const admin = companionIdentity ? { id: companionIdentity.id } : await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    items: await listOperatorJobs("open"),
    companions: await listOperatorCompanions(),
    allowlistRules: getOperatorAllowlistRules(),
  });
}
