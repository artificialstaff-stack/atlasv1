import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getJarvisDashboardWithRouting, prepareJarvisAutofixProposal } from "@/lib/jarvis";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const proposal = await prepareJarvisAutofixProposal(id);
    const dashboard = await getJarvisDashboardWithRouting();
    return NextResponse.json({ proposal, dashboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis autofix proposal hazırlanamadı." },
      { status: 500 },
    );
  }
}
