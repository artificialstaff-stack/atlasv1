import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest, NextResponse } from "next/server";

/**
 * CopilotKit Runtime API Route
 * GET  /api/copilot — Agent discovery / info endpoint
 * POST /api/copilot — AI chat endpoint
 *
 * Env: OPENAI_API_KEY gerekli
 */
const runtime = new CopilotRuntime();
const serviceAdapter = new OpenAIAdapter();

const handler = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilot",
    });

    return handleRequest(req);
  } catch (error: unknown) {
    console.error("[CopilotKit Runtime Error]", error);
    return NextResponse.json(
      { error: "CopilotKit runtime error", agents: [] },
      { status: 200 }
    );
  }
};

export const GET = handler;
export const POST = handler;
