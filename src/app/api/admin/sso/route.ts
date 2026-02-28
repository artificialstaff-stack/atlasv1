/**
 * ─── Atlas Platform — SSO Admin API ───
 * GET    /api/admin/sso          — list providers & config
 * POST   /api/admin/sso          — register provider
 * PATCH  /api/admin/sso          — update config
 * DELETE /api/admin/sso?id=x     — remove provider
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSSOConfig,
  getSSOProviders,
  registerSSOProvider,
  updateSSOConfig,
  removeSSOProvider,
} from "@/lib/sso";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    config: getSSOConfig(),
    providers: getSSOProviders(),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const provider = registerSSOProvider(body);
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) {
    console.error("[SSO Error]", err);
    return NextResponse.json({ error: "Provider kaydedilemedi" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const config = updateSSOConfig(body);
  return NextResponse.json({ config });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Provider ID gerekli" }, { status: 400 });

  const success = removeSSOProvider(id);
  if (!success) return NextResponse.json({ error: "Provider bulunamadı" }, { status: 404 });

  return NextResponse.json({ message: "Provider silindi" });
}
