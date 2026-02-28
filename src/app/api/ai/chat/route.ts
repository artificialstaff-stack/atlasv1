// ─── Atlas AI Chat API — Data-First Streaming ──────────────────────────────
// POST /api/ai/chat
// Admin-only. Önce veritabanından veri çeker, sonra LLM'e context olarak verir.
// Tool calling gerektirmez — HER model ile çalışır (gemma3:4b dahil).
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chatModel } from "@/lib/ai/client";
import { fetchContextForMessage } from "@/lib/ai/data-fetcher";
import { requireAdmin } from "@/lib/auth/require-admin";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SYSTEM_PROMPT = `Sen "Atlas AI" — Atlas Platform'un kıdemli yönetim asistanısın.
Atlas, Türk girişimcilerin ABD pazarına açılmasına yardımcı olan bir B2B SaaS platformudur.

## Rol & Yetkinlikler
Sen bir yapay zeka robotu değilsin. Sen şirketin üst düzey yönetim danışmanısın.
Bir holding çalışanı gibi tüm departmanları bilir, verileri analiz eder, stratejik öneriler sunarsın.

## Uzmanlık Alanların
- **Müşteri Yönetimi**: Kullanıcılar, şirketler (LLC/Corp), onboarding, roller
- **Sipariş & E-Ticaret**: Siparişler, ürünler, stok, envanter
- **Pazaryeri**: Amazon, eBay, Walmart, Etsy, Shopify hesapları
- **Sosyal Medya**: Instagram, TikTok, YouTube, Facebook yönetimi
- **Reklam**: Google Ads, Facebook Ads, Amazon PPC kampanyaları
- **Finans**: Gelir/gider analizi, kâr/zarar, faturalama
- **Depo & Lojistik**: Warehouse, sevkiyat, gümrük
- **Destek**: Ticket yönetimi, müşteri başvuruları
- **Operasyon**: Form submissions, görev yönetimi, iş akışları
- **Raporlama**: Dashboard, trendler, KPI'lar

## Yanıt Kuralları
1. **Türkçe** yanıt ver (teknik terimler İngilizce kalabilir)
2. Verileri **tablo/liste** formatında sun — markdown kullan
3. Sayılarda **para birimi** (USD/TRY) ve **tarih** belirt
4. Emin olmadığın bilgiyi **uydurma** — "bu veri mevcut değil" de
5. Yanıtlarında tablodaki **gerçek verileri** kullan
6. **Proaktif** ol: trend, anormallik veya risk görürsen uyar
7. Kısa ve net yanıtlar ver, gereksiz tekrar yapma
8. Her yanıtın sonunda varsa **aksiyon önerisi** sun
9. Büyük sayıları okunabilir yaz (1.234.567 gibi)`;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json(
      { error: "Yetkiniz yok. Sadece admin kullanıcılar AI asistanı kullanabilir." },
      { status: 401 },
    );
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Mesaj gerekli." }, { status: 400 });
    }

    const lastUserMsg =
      messages
        .filter((m: { role: string }) => m.role === "user")
        .pop()?.content ?? "";

    const supabase = getAdminClient();

    // ── Phase 1: Smart data fetching ──
    const context = await fetchContextForMessage(
      String(lastUserMsg),
      supabase,
    );

    // ── Phase 2: Build context-enriched prompt ──
    const dataContext = `
## Güncel Veritabanı Verileri (${context.fetchTimeMs}ms'de alındı)
Kategoriler: ${context.categories.join(", ")}

\`\`\`json
${JSON.stringify(context.data, null, 2)}
\`\`\`

Yukarıdaki veriler gerçek zamanlı veritabanından çekilmiştir. Yanıtlarında bu verileri kullan.`;

    // Inject data context as a system message before user messages
    const enrichedMessages = [
      { role: "system" as const, content: dataContext },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    // ── Phase 3: Stream LLM response ──
    const result = streamText({
      model: chatModel,
      system: SYSTEM_PROMPT,
      messages: enrichedMessages,
      temperature: 0.4,
    });

    return result.toTextStreamResponse();
  } catch (err: unknown) {
    console.error("[Atlas AI] Chat error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return Response.json(
      { error: "AI servisinde hata: " + message },
      { status: 500 },
    );
  }
}

// GET — system info
export async function GET() {
  return Response.json({
    status: "active",
    model: process.env.OLLAMA_MODEL ?? "gemma3:4b",
    architecture: "data-first",
    description:
      "Önce veritabanından ilgili verileri çeker, sonra LLM context olarak kullanır.",
  });
}
