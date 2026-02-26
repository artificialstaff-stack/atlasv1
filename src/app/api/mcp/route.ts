import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * MCP (Model Context Protocol) Server Endpoint
 * POST /api/mcp — Tool discovery & execution
 *
 * CTO Raporu: MCP tools are stateless JSON-RPC style endpoints
 * that AI agents call to interact with Atlas platform data.
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

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ─── Tool Tanımları ───

const MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: "atlas.products.list",
    description: "Kullanıcının ürünlerini ve stok bilgilerini listeler",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
        includeInactive: { type: "boolean", description: "Aktif olmayan ürünleri de dahil et" },
      },
      required: ["userId"],
    },
  },
  {
    name: "atlas.orders.list",
    description: "Kullanıcının siparişlerini getirir",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
        status: { type: "string", description: "Durum filtresi" },
        limit: { type: "number", description: "Maksimum sonuç sayısı" },
      },
      required: ["userId"],
    },
  },
  {
    name: "atlas.tasks.list",
    description: "Süreç görevlerini (LLC, EIN, gümrük) listeler",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "atlas.tasks.update",
    description: "Bir görevin durumunu günceller",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Görev UUID" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "blocked"],
          description: "Yeni durum",
        },
        notes: { type: "string", description: "Ek notlar" },
      },
      required: ["taskId", "status"],
    },
  },
  {
    name: "atlas.tickets.create",
    description: "Yeni destek talebi oluşturur",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
        subject: { type: "string", description: "Talep konusu" },
        description: { type: "string", description: "Detaylı açıklama" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Öncelik seviyesi",
        },
      },
      required: ["userId", "subject", "description"],
    },
  },
  {
    name: "atlas.inventory.alerts",
    description: "Düşük stok uyarılarını getirir",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
        threshold: { type: "number", description: "Stok eşik değeri (varsayılan: 10)" },
      },
      required: ["userId"],
    },
  },
  {
    name: "atlas.documents.list",
    description: "Kullanıcının belgelerini listeler",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı UUID" },
      },
      required: ["userId"],
    },
  },
];

// ─── Tool Handler'ları ───

async function handleToolCall(
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const supabase = await createClient();

  switch (toolName) {
    case "atlas.products.list": {
      const query = supabase
        .from("products")
        .select("id, name, sku, hs_code, stock_turkey, stock_us, base_price")
        .eq("owner_id", params.userId as string);
      if (!params.includeInactive) query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    case "atlas.orders.list": {
      let query = supabase
        .from("orders")
        .select("id, status, platform, platform_order_id, tracking_ref, created_at")
        .eq("user_id", params.userId as string)
        .order("created_at", { ascending: false });
      if (params.status) query = query.eq("status", params.status as string);
      query = query.limit((params.limit as number) ?? 20);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    case "atlas.tasks.list": {
      const { data, error } = await supabase
        .from("process_tasks")
        .select("id, task_name, task_status, task_category, notes, completed_at, sort_order")
        .eq("user_id", params.userId as string)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    }

    case "atlas.tasks.update": {
      const updateData: Record<string, unknown> = {
        task_status: params.status as string,
      };
      if (params.notes) updateData.notes = params.notes;
      if (params.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("process_tasks")
        .update(updateData)
        .eq("id", params.taskId as string)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    case "atlas.tickets.create": {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: params.userId as string,
          subject: params.subject as string,
          description: params.description as string,
          priority: (params.priority as string) ?? "medium",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    case "atlas.inventory.alerts": {
      const threshold = (params.threshold as number) ?? 10;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, stock_turkey, stock_us")
        .eq("owner_id", params.userId as string)
        .eq("is_active", true)
        .or(`stock_turkey.lt.${threshold},stock_us.lt.${threshold}`);
      if (error) throw error;
      return data;
    }

    case "atlas.documents.list": {
      const { data } = await supabase.storage
        .from("customer-documents")
        .list(params.userId as string, { limit: 100 });
      return data?.filter((f) => f.id !== null) ?? [];
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
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
