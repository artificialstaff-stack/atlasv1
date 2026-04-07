import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createCustomerDeliverable, getCustomerWorkspaceDeliverables } from "@/lib/customer-workspace";
import type { CustomerWorkstreamKey } from "@/lib/customer-workspace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deliverables = await getCustomerWorkspaceDeliverables(id);
  return NextResponse.json({ deliverables });
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        summary?: string;
        workstreamKey?: CustomerWorkstreamKey | null;
        artifactUrl?: string | null;
        artifactLabel?: string | null;
        approvalRequired?: boolean;
      }
    | null;

  const title = body?.title?.trim();
  const summary = body?.summary?.trim();
  if (!title || !summary) {
    return NextResponse.json({ error: "title ve summary zorunludur." }, { status: 400 });
  }

  const deliverable = await createCustomerDeliverable({
    userId: id,
    title,
    summary,
    workstreamKey: body?.workstreamKey ?? null,
    artifactUrl: body?.artifactUrl ?? null,
    artifactLabel: body?.artifactLabel ?? null,
    approvalRequired: body?.approvalRequired ?? false,
    createdBy: admin.id,
  });

  return NextResponse.json({ success: true, deliverable }, { status: 201 });
}
