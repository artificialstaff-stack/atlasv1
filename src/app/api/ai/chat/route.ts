// ─── Atlas AI Chat API — Streaming Endpoint ─────────────────────────────────
// POST /api/ai/chat
// Admin-only. Streams AI responses using Ollama (local LLM) via Vercel AI SDK.
// Smart tool routing: selects ~20 relevant tools per query from 151 total.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chatModel } from "@/lib/ai/client";
import { selectTools, createAllTools } from "@/lib/ai/tools";
import { requireAdmin } from "@/lib/auth/require-admin";

// Service-role Supabase client (bypasses RLS) for admin tool access
function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SYSTEM_PROMPT = `Sen Atlas Platform'un kıdemli yönetim asistanısın — "Atlas AI".
Atlas, Türk girişimcilerin ABD pazarına açılmasına yardımcı olan bir B2B SaaS platformudur.

Görevlerin:
• Müşteri yönetimi — kullanıcılar, şirketler (LLC/Corp), abonelikler, roller
• Sipariş & Ürün takibi — siparişler, ürünler, stok, envanter hareketleri
• Pazaryeri hesapları — Amazon, eBay, Walmart, Etsy, Shopify ve diğerleri
• Sosyal medya — Instagram, TikTok, YouTube, Facebook hesap yönetimi
• Reklam kampanyaları — Google Ads, Facebook Ads, Amazon PPC performansı
• Finansal kayıtlar — gelir, gider, kâr/zarar analizi
• Fatura & Billing — faturalar, ödemeler, abonelik planları
• Depo & Kargo — warehouse yönetimi, sevkiyat takibi, gümrük
• Form & İş akışları — müşteri başvuruları, görev yönetimi
• Destek talebi — ticket yönetimi ve müşteri desteği
• Raporlama & Analiz — dashboard, trendler, performans metrikleri
• Sistem sağlığı — veritabanı durumu, audit logları

Kurallar:
1. Her zaman Türkçe yanıt ver (teknik terimler İngilizce kalabilir).
2. Verileri sunarken tablo/liste formatı kullan, özet ve detay dengesi kur.
3. Sayısal verilerde para birimi (USD/TRY) ve tarihleri belirt.
4. Emin olmadığın bilgiyi uydurma — "bu veri şu anda mevcut değil" de.
5. Tool kullan: her soruyu doğrudan veritabanından yanıtla.
6. Holding çalışanı gibi davran — her departmanı bil, her metriği takip et.
7. Proaktif ol: veri anormalliği görürsen uyar, önerilerde bulun.
8. Kısa ve net yanıtlar ver, gereksiz tekrar yapma.`;

export async function POST(req: Request) {
  // Auth check — admin only
  const admin = await requireAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Yetkiniz yok. Sadece admin kullanıcılar AI asistanı kullanabilir." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Mesaj gerekli." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Get the last user message for tool routing
    const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop()?.content ?? "";

    // Create admin Supabase client for full DB access
    const supabase = getAdminClient();

    // Smart tool selection based on user's message content
    const tools = selectTools(String(lastUserMsg), supabase);

    // Stream response
    const result = streamText({
      model: chatModel,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[Atlas AI] Chat error:", err);
    return new Response(JSON.stringify({ error: "AI servisinde bir hata oluştu." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// GET — tool count info
export async function GET() {
  const supabase = getAdminClient();
  const allTools = createAllTools(supabase);
  return Response.json({
    status: "active",
    model: process.env.OLLAMA_MODEL ?? "gemma3:4b",
    total_tools: Object.keys(allTools).length,
    tool_names: Object.keys(allTools).sort(),
  });
}
