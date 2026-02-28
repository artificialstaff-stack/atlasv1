import { NextResponse } from "next/server";

/**
 * CopilotKit Runtime API Route — DEVRE DIŞI
 *
 * CopilotKit şu an devre dışı. Agent yapılandırılınca:
 * 1. npm install @copilotkit/runtime
 * 2. Bu dosyada CopilotRuntime + OpenAIAdapter'ı import et
 * 3. OPENAI_API_KEY ortam değişkenini ayarla
 */
export async function GET() {
  return NextResponse.json(
    { status: "disabled", message: "CopilotKit runtime is not configured", agents: [] },
    { status: 200 }
  );
}

export async function POST() {
  return NextResponse.json(
    { status: "disabled", message: "CopilotKit runtime is not configured", agents: [] },
    { status: 200 }
  );
}
