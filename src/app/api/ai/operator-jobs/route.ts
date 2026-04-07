import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCopilotOperatorJobs } from "@/lib/admin-copilot/service";
import { getOperatorAllowlistRules, listOperatorCompanions } from "@/lib/admin-copilot/operator-jobs";
import { getOperatorCompanionIdentity, hasOperatorCompanionAccess } from "@/lib/admin-copilot/operator-auth";

export async function GET(request: Request) {
  const companionIdentity = getOperatorCompanionIdentity(request);
  const admin = companionIdentity ? { id: companionIdentity.id } : await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getCopilotOperatorJobs();
  return NextResponse.json({
    items,
    companions: await listOperatorCompanions(),
    allowlistRules: getOperatorAllowlistRules(),
  });
}
