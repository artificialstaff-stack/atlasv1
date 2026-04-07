/**
 * ─── Provider Management API ───
 *
 * GET    → List all registered providers + health
 * POST   → Register a new provider
 * PATCH  → Update an existing provider
 * DELETE → Remove a provider
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listProviders,
  registerProvider,
  removeProvider,
  getProvider,
  getAllProviderHealth,
} from "@/lib/ai/provider-registry";
import { generateProviderReport } from "@/lib/jarvis/brain-opinions";
import type { ProviderConfig } from "@/lib/ai/provider-types";

// ─── GET: List all providers + brain report ───

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = generateProviderReport();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider listesi alınamadı." },
      { status: 500 },
    );
  }
}

// ─── POST: Register a new provider ───

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, baseURL, apiKey, models, priority, enabled, rateLimits, capabilities, isHqtt } = body;

    if (!id || typeof id !== "string" || !name || typeof name !== "string" || !baseURL || typeof baseURL !== "string") {
      return NextResponse.json(
        { error: "id, name ve baseURL zorunludur." },
        { status: 400 },
      );
    }

    // Check if already exists
    if (getProvider(id)) {
      return NextResponse.json(
        { error: `Provider '${id}' zaten kayıtlı.` },
        { status: 409 },
      );
    }

    const config: ProviderConfig = {
      id,
      name,
      baseURL,
      apiKey: apiKey ?? "",
      models: models ?? {},
      priority: typeof priority === "number" ? priority : 50,
      enabled: enabled !== false,
      rateLimits: rateLimits ?? undefined,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      isHqtt: isHqtt === true,
    };

    registerProvider(config);

    return NextResponse.json({ success: true, provider: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider eklenemedi." },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update existing provider ───

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id zorunludur." }, { status: 400 });
    }

    const existing = getProvider(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Provider '${id}' bulunamadı.` },
        { status: 404 },
      );
    }

    // Remove and re-register with merged config
    removeProvider(id);
    const merged: ProviderConfig = {
      ...existing.config,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.baseURL !== undefined && { baseURL: updates.baseURL }),
      ...(updates.apiKey !== undefined && { apiKey: updates.apiKey }),
      ...(updates.models !== undefined && { models: updates.models }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      ...(updates.rateLimits !== undefined && { rateLimits: updates.rateLimits }),
      ...(updates.capabilities !== undefined && { capabilities: updates.capabilities }),
      ...(updates.isHqtt !== undefined && { isHqtt: updates.isHqtt }),
    };

    registerProvider(merged);

    return NextResponse.json({ success: true, provider: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider güncellenemedi." },
      { status: 500 },
    );
  }
}

// ─── DELETE: Remove a provider ───

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query parametresi zorunludur." }, { status: 400 });
    }

    if (!getProvider(id)) {
      return NextResponse.json(
        { error: `Provider '${id}' bulunamadı.` },
        { status: 404 },
      );
    }

    removeProvider(id);
    return NextResponse.json({ success: true, removed: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider silinemedi." },
      { status: 500 },
    );
  }
}
