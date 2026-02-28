/**
 * ─── Atlas Platform — Feature Flags API ───
 * GET  /api/admin/features         — list all flags
 * PATCH /api/admin/features        — update a flag
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllFlags, updateFlag } from "@/lib/feature-flags";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ flags: getAllFlags() });
  } catch (err) {
    console.error("[Feature Flags Error]", err);
    return NextResponse.json({ error: "Özellik bayrakları alınamadı" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin || admin.role !== "super_admin") {
      return NextResponse.json({ error: "Sadece super_admin değiştirebilir" }, { status: 403 });
    }

    const body = await req.json();
    const { key, ...updates } = body;

    if (!key) {
      return NextResponse.json({ error: "Flag key zorunlu" }, { status: 400 });
    }

    const success = updateFlag(key, updates);
    if (!success) {
      return NextResponse.json({ error: "Flag bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ message: `${key} güncellendi` });
  } catch (err) {
    console.error("[Feature Flags Error]", err);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}
