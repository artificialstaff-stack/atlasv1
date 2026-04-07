/**
 * ─── Provider Test Connection ───
 *
 * POST → Tests a provider connection by making a minimal API call.
 * Used by admin UI to verify API keys and endpoints before saving.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { baseURL, apiKey, model } = body;

    if (!baseURL || typeof baseURL !== "string") {
      return NextResponse.json({ error: "baseURL zorunludur." }, { status: 400 });
    }
    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "Test için bir model adı gerekli." }, { status: 400 });
    }

    const sdk = createOpenAI({
      baseURL,
      apiKey: apiKey ?? "",
    });

    const start = Date.now();
    const result = await generateText({
      model: sdk.chat(model),
      prompt: "Respond with exactly one word: OK",
    });
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      latencyMs,
      response: result.text.slice(0, 100), // truncate for safety
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bağlantı başarısız.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 },
    );
  }
}
