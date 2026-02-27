/**
 * ─── Atlas Platform — Admin Dashboard Stats API ───
 * Calls get_dashboard_stats() PostgreSQL function.
 * Only admin/super_admin can access.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the SECURITY DEFINER function (it checks admin role internally)
    const { data, error } = await supabase.rpc("get_dashboard_stats");

    if (error) {
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stats: data });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
