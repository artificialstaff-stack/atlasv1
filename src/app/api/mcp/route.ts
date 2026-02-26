import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS, handleToolCall } from "@/lib/ai/mcp-handlers";

/**
 * MCP (Model Context Protocol) Server Endpoint
 * POST /api/mcp — Tool discovery & execution
 *
 * Tool tanımları ve handler'lar: src/lib/ai/mcp-handlers.ts
 *
 * Supported methods:
 *   - tools/list → Tüm mevcut tool'ları listele
 *   - tools/call → Belirli bir tool'u çağır
 */

interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

// ─── Route Handler ───

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MCPRequest;

    if (body.jsonrpc !== "2.0") {
      return NextResponse.json(
        { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: body.id },
        { status: 400 }
      );
    }

    switch (body.method) {
      case "tools/list": {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: { tools: MCP_TOOLS },
          id: body.id,
        });
      }

      case "tools/call": {
        const toolName = body.params?.name as string;
        const toolArgs = (body.params?.arguments as Record<string, unknown>) ?? {};

        if (!toolName) {
          return NextResponse.json(
            { jsonrpc: "2.0", error: { code: -32602, message: "Missing tool name" }, id: body.id },
            { status: 400 }
          );
        }

        const result = await handleToolCall(toolName, toolArgs);
        return NextResponse.json({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
          id: body.id,
        });
      }

      default: {
        return NextResponse.json(
          { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: body.id },
          { status: 404 }
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
      { status: 500 }
    );
  }
}
