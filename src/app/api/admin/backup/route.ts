/**
 * ─── Atlas Platform — Backup & Health API ───
 * GET  /api/admin/backup?userId=x  — create user backup
 * GET  /api/admin/backup/health    — DB health check
 */

import { NextRequest, NextResponse } from "next/server";
import { createUserBackup, checkDatabaseHealth } from "@/lib/backup";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const action = new URL(req.url).searchParams.get("action");

    if (action === "health") {
      const health = await checkDatabaseHealth();
      return NextResponse.json(health);
    }

    // Default: create backup for target user or self
    const targetUserId = new URL(req.url).searchParams.get("userId") || admin.id;
    const backup = await createUserBackup(targetUserId);

    return new NextResponse(JSON.stringify(backup), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="atlas-backup-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error("[Backup Error]", err);
    return NextResponse.json({ error: "Yedekleme başarısız" }, { status: 500 });
  }
}
