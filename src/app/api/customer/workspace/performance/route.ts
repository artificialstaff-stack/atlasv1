import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerWorkspacePerformance } from "@/lib/customer-workspace";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const performance = await getCustomerWorkspacePerformance(user.id);
  return NextResponse.json({ performance });
}
