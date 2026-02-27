import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/notifications";

/**
 * GET /api/notifications — Kullanıcı bildirimlerini getir
 * POST /api/notifications — Bildirimi okundu işaretle / Tümünü okundu yap
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const result = await getNotifications(user.id, page, pageSize);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, notificationId } = body as {
    action: "mark_read" | "mark_all_read";
    notificationId?: string;
  };

  if (action === "mark_all_read") {
    await markAllAsRead(user.id);
    return NextResponse.json({ success: true });
  }

  if (action === "mark_read" && notificationId) {
    await markAsRead(notificationId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
