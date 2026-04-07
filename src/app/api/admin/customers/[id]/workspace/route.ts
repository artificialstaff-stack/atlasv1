import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const workspace = await getCustomerWorkspaceView(id);
  return NextResponse.json({ workspace });
}
