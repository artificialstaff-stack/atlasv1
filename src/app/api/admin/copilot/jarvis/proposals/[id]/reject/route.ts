import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getJarvisDashboardWithRouting, rejectJarvisAutofixProposal } from "@/lib/jarvis";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { note?: string | null } | null;
    const proposal = await rejectJarvisAutofixProposal(id, body?.note ?? null);
    const dashboard = await getJarvisDashboardWithRouting();
    return NextResponse.json({ proposal, dashboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis proposal reddedilemedi." },
      { status: 500 },
    );
  }
}
