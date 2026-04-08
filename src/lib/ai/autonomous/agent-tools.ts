// ─── Atlas AI — Autonomous Agent Tools ──────────────────────────────────────
// Real, executable tools for the ReAct agent engine.
// Each tool actually DOES something — not stubs, not demos.
//
// Tool categories:
//   1. Data Tools      — Query/mutate the Supabase database
//   2. Web Tools       — Fetch URLs, scrape content, research
//   3. Analysis Tools  — Deep platform analysis, trends
//   4. Content Tools   — Generate text, images, reports via LLM
//   5. Platform Tools  — Inspect platform state, metrics, health
//   6. Action Tools    — Send notifications, update records, manage
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getAppBaseUrl } from "@/lib/app-surface";
import { chatModel, researchModel } from "@/lib/ai/client";
import { filterSelectableAgentTools } from "@/lib/ai/orchestrator/health";
import type { AgentTool, ToolContext, ToolContextCookie, ToolResult } from "./react-engine";

// ─── Helper: Run LLM ───────────────────────────────────────────────────────

async function llm(system: string, prompt: string, maxTokens = 600): Promise<string> {
  const tryModel = async (selectedModel: typeof chatModel) => {
    let text = "";
    const result = streamText({
      model: selectedModel,
      system,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxOutputTokens: maxTokens,
    });
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    return text.trim();
  };

  try {
    return await tryModel(researchModel);
  } catch {
    return await tryModel(chatModel);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...(kırpıldı)` : text;
}

function getArtifactOutputRoot() {
  const currentDir = process.cwd();
  const normalized = currentDir.replace(/\\/g, "/");
  const standaloneSuffixes = [
    "/.next-build/standalone",
    "/.next-runtime/standalone",
    "/.next/standalone",
  ];

  if (standaloneSuffixes.some((suffix) => normalized.endsWith(suffix))) {
    return path.resolve(currentDir, "..", "..");
  }
  return currentDir;
}

function isAtlasInternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const isAtlasLocalHost =
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname.endsWith(".atlas.localhost");

    return isAtlasLocalHost && (parsed.pathname.startsWith("/admin") || parsed.pathname.startsWith("/panel"));
  } catch {
    return false;
  }
}

function getBrowserSessionStatePath(surface: string, authUserId?: string) {
  const safeUserId = authUserId ? authUserId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) : "default";
  return path.join(getArtifactOutputRoot(), "output", "playwright", `operator-state-${surface}-${safeUserId}.json`);
}

async function ensureDirectoryForFile(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function mapRequestCookiesToPlaywrightCookies(cookies: ToolContextCookie[], targetUrl: string) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: targetUrl,
  }));
}

async function resolveAuthUserEmail(ctx: ToolContext, authUserId: string) {
  const { data, error } = await ctx.supabase
    .from("users")
    .select("email")
    .eq("id", authUserId)
    .maybeSingle();

  if (error || !data?.email) {
    return null;
  }

  return data.email;
}

async function generateMagicLink(ctx: ToolContext, email: string, redirectTo: string) {
  const adminApi = (ctx.supabase as typeof ctx.supabase & {
    auth: {
      admin: {
        generateLink: (input: {
          type: "magiclink";
          email: string;
          options?: { redirectTo?: string };
        }) => Promise<{
          data?: { properties?: { action_link?: string | null } };
          error?: { message?: string | null } | null;
        }>;
      };
    };
  }).auth.admin;

  const { data, error } = await adminApi.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
    },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message ?? "Magic link üretilemedi.");
  }

  return data.properties.action_link;
}

async function authenticateAtlasPage(input: {
  page: import("@playwright/test").Page;
  browser: import("@playwright/test").Browser;
  ctx: ToolContext;
  targetUrl: string;
  surface: "admin" | "portal";
  authUserId?: string;
  reuseSession: boolean;
}) {
  const statePath = getBrowserSessionStatePath(input.surface, input.authUserId);
  await ensureDirectoryForFile(statePath);
  const isExpectedSurfaceUrl = (candidateUrl: string) => {
    const pathName = new URL(candidateUrl).pathname.toLowerCase();
    return pathName.startsWith(`/${input.surface === "admin" ? "admin" : "panel"}`) && !pathName.includes("/login");
  };

  let context = input.page.context();
  let sessionReused = false;

  if (input.reuseSession && existsSync(statePath)) {
    try {
      context = await input.browser.newContext({
        viewport: { width: 1440, height: 960 },
        storageState: statePath,
      });
      sessionReused = true;
    } catch {
      sessionReused = false;
    }
  }

  let page = sessionReused ? await context.newPage() : input.page;

  const goToTarget = async () => {
    await page.goto(input.targetUrl, { waitUntil: "networkidle", timeout: 45_000 });
  };

  if (sessionReused) {
    await goToTarget();
    if (!isExpectedSurfaceUrl(page.url())) {
      await context.close();
      context = input.page.context();
      page = input.page;
      sessionReused = false;
    } else {
      return {
        page,
        context,
        sessionReused,
      };
    }
  }

  if (input.ctx.requestCookies?.length) {
    const cookieContext = await input.browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const cookiePage = await cookieContext.newPage();

    try {
      await cookieContext.addCookies(
        mapRequestCookiesToPlaywrightCookies(input.ctx.requestCookies, input.targetUrl),
      );
      await cookiePage.goto(input.targetUrl, { waitUntil: "networkidle", timeout: 45_000 });

      if (isExpectedSurfaceUrl(cookiePage.url())) {
        await cookiePage.context().storageState({ path: statePath });
        return {
          page: cookiePage,
          context: cookieContext,
          sessionReused: false,
        };
      }
    } catch {
      // Fall through to magic-link recovery when copied request cookies are insufficient.
    }

    await cookieContext.close();
  }

  const authUserId = input.authUserId ?? input.ctx.userId;
  const email = await resolveAuthUserEmail(input.ctx, authUserId);
  if (!email) {
    throw new Error("Authenticated browser lane için kullanıcı e-postası bulunamadı.");
  }

  const actionLink = await generateMagicLink(input.ctx, email, input.targetUrl);
  await page.goto(actionLink, { waitUntil: "networkidle", timeout: 45_000 });
  await goToTarget();

  if (!isExpectedSurfaceUrl(page.url())) {
    throw new Error("Magic link oturumu hedef yüzeye taşınamadı.");
  }

  await page.context().storageState({ path: statePath });

  return {
    page,
    context: page.context(),
    sessionReused,
  };
}

function extractSearxResults(html: string, maxResults: number) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const articlePattern = /<article[\s\S]*?class="[^"]*result[^"]*"[\s\S]*?<\/article>/gi;
  const articles = html.match(articlePattern) ?? [];

  for (const article of articles) {
    const titleMatch = article.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = article.match(/<p[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
      ?? article.match(/<span[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

    const url = titleMatch?.[1] ?? "";
    const title = htmlToText(titleMatch?.[2] ?? "").trim();
    const snippet = htmlToText(snippetMatch?.[1] ?? "").trim();

    if (title) {
      results.push({ title, url, snippet });
    }

    if (results.length >= maxResults) break;
  }

  return results;
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  return JSON.parse(text) as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TOOLS — Real database queries
// ═══════════════════════════════════════════════════════════════════════════

export const queryDatabaseTool: AgentTool = {
  name: "query_database",
  description: "Supabase veritabanından herhangi bir tabloyu sorgula. SELECT işlemi yapar, veri döndürür.",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı (users, orders, customer_companies, products, financial_records, notifications, social_media_accounts, contact_submissions, support_tickets, marketplace_stores, inventory_items, warehouse_locations, ad_campaigns, etc.)", required: true },
    { name: "select", type: "string", description: "Seçilecek kolonlar, virgülle ayrılmış (örn: id,name,status). Varsayılan: *", required: false },
    { name: "filters", type: "object", description: "Filtreler: {kolon: değer} formatında. Örn: {status: 'active'}", required: false },
    { name: "limit", type: "number", description: "Döndürülecek max kayıt sayısı. Varsayılan: 20", required: false },
    { name: "order", type: "string", description: "Sıralama kolonu. Varsayılan: created_at", required: false },
    { name: "ascending", type: "boolean", description: "Artan sıra mı? Varsayılan: false (en yeni önce)", required: false },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;
    if (!table) return { success: false, data: null, summary: "Tablo adı gerekli", error: "Missing table" };

    const select = (params.select as string) || "*";
    const limit = (params.limit as number) || 20;
    const order = (params.order as string) || "created_at";
    const ascending = params.ascending === true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (ctx.supabase as any).from(table).select(select).order(order, { ascending }).limit(limit);

      // Apply filters
      const filters = params.filters as Record<string, unknown> | undefined;
      if (filters) {
        for (const [key, val] of Object.entries(filters)) {
          if (val !== undefined && val !== null) {
            query = query.eq(key, val);
          }
        }
      }

      const { data, error } = await query;
      if (error) return { success: false, data: null, summary: `Sorgu hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: { records: data, count: data?.length ?? 0, table },
        summary: `${table} tablosundan ${data?.length ?? 0} kayıt getirildi`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `DB hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`, error: String(err) };
    }
  },
};

export const countRecordsTool: AgentTool = {
  name: "count_records",
  description: "Bir tablodaki kayıt sayısını say. Filtrelenebilir.",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı", required: true },
    { name: "filters", type: "object", description: "Opsiyonel filtreler: {kolon: değer}", required: false },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (ctx.supabase as any).from(table).select("id", { count: "exact", head: true });

      const filters = params.filters as Record<string, unknown> | undefined;
      if (filters) {
        for (const [key, val] of Object.entries(filters)) {
          if (val !== undefined) query = query.eq(key, val);
        }
      }

      const { count, error } = await query;
      if (error) return { success: false, data: null, summary: `Sayım hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: { table, count },
        summary: `${table} tablosunda ${count ?? 0} kayıt var`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const insertRecordTool: AgentTool = {
  name: "insert_record",
  description: "Veritabanına yeni kayıt ekle. INSERT işlemi yapar.",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı", required: true },
    { name: "data", type: "object", description: "Eklenecek veri: {kolon: değer} formatında", required: true },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;
    const data = params.data as Record<string, unknown>;
    if (!table || !data) return { success: false, data: null, summary: "Tablo ve veri gerekli", error: "Missing params" };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (ctx.supabase as any).from(table).insert(data).select().single();
      if (error) return { success: false, data: null, summary: `Insert hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: result,
        summary: `${table} tablosuna yeni kayıt eklendi (id: ${result?.id ?? "?"})`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const updateRecordTool: AgentTool = {
  name: "update_record",
  description: "Veritabanındaki mevcut kaydı güncelle. UPDATE işlemi yapar.",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı", required: true },
    { name: "id", type: "string", description: "Güncellenecek kaydın ID'si", required: true },
    { name: "data", type: "object", description: "Güncellenecek alanlar: {kolon: yeni_değer}", required: true },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;
    const id = params.id as string;
    const data = params.data as Record<string, unknown>;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (ctx.supabase as any).from(table).update(data).eq("id", id).select().single();
      if (error) return { success: false, data: null, summary: `Update hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: result,
        summary: `${table} tablosunda kayıt güncellendi (id: ${id})`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const deleteRecordTool: AgentTool = {
  name: "delete_record",
  description: "Veritabanından kayıt sil. DİKKAT: Geri alınamaz!",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı", required: true },
    { name: "id", type: "string", description: "Silinecek kaydın ID'si", required: true },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;
    const id = params.id as string;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (ctx.supabase as any).from(table).delete().eq("id", id);
      if (error) return { success: false, data: null, summary: `Delete hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: { deleted: id },
        summary: `${table} tablosundan kayıt silindi (id: ${id})`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEB TOOLS — Fetch URLs, research
// ═══════════════════════════════════════════════════════════════════════════

export const fetchWebPageTool: AgentTool = {
  name: "fetch_webpage",
  description: "Bir URL'den web sayfası içeriğini çek. HTML'i temiz metne dönüştürür. Web araştırması, pazar analizi, fiyat karşılaştırma, rakip analizi için kullan.",
  parameters: [
    { name: "url", type: "string", description: "Çekilecek URL (https://...)", required: true },
    { name: "maxLength", type: "number", description: "Max karakter sayısı. Varsayılan: 3000", required: false },
  ],
  execute: async (params) => {
    const url = params.url as string;
    if (!url) return { success: false, data: null, summary: "URL gerekli", error: "Missing URL" };

    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "AtlasAI/1.0 (Research Bot)",
          "Accept": "text/html,application/json,text/plain",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        return { success: false, data: null, summary: `HTTP ${resp.status}: ${resp.statusText}`, error: `HTTP ${resp.status}` };
      }

      const contentType = resp.headers.get("content-type") ?? "";
      let text: string;

      if (contentType.includes("json")) {
        const json = await resp.json();
        text = JSON.stringify(json, null, 2);
      } else {
        const html = await resp.text();
        text = htmlToText(html);
      }

      const maxLength = (params.maxLength as number) ?? 3000;
      const truncated = truncateText(text, maxLength);

      return {
        success: true,
        data: { url, contentLength: text.length, content: truncated },
        summary: `${url} sayfasından ${text.length} karakter çekildi`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Fetch hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`, error: String(err) };
    }
  },
};

export const webSearchTool: AgentTool = {
  name: "web_search",
  description: "Web'de arama yap. Önce yerel SearXNG ile arar, gerekirse dış fallback kullanır. Pazar araştırması, trend analizi ve benchmark görevleri için kullan.",
  parameters: [
    { name: "query", type: "string", description: "Arama sorgusu", required: true },
    { name: "maxResults", type: "number", description: "Max sonuç sayısı. Varsayılan: 5", required: false },
  ],
  execute: async (params) => {
    const query = params.query as string;
    if (!query) return { success: false, data: null, summary: "Arama sorgusu gerekli", error: "Missing query" };

    try {
      const maxResults = (params.maxResults as number) ?? 5;
      const searxUrl = process.env.SEARXNG_URL ?? "http://localhost:8888";
      try {
        const response = await fetch(`${searxUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            q: query,
            category_general: "1",
            language: "en-US",
            safesearch: "0",
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          const html = await response.text();
          const results = extractSearxResults(html, maxResults);
          if (results.length > 0) {
            return {
              success: true,
              data: { query, results, totalResults: results.length, engine: "searxng" },
              summary: `"${query}" için SearXNG üzerinden ${results.length} sonuç bulundu`,
            };
          }
        }
      } catch {
        // fallback below
      }

      const encoded = encodeURIComponent(query);
      const resp = await fetch(
        `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!resp.ok) {
        return { success: false, data: null, summary: `Arama hatası: HTTP ${resp.status}`, error: `HTTP ${resp.status}` };
      }

      const json = await resp.json();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      if (json.Abstract) {
        results.push({ title: json.Heading ?? "Özet", url: json.AbstractURL ?? "", snippet: json.Abstract });
      }
      if (json.RelatedTopics) {
        for (const topic of json.RelatedTopics.slice(0, maxResults)) {
          if (topic.Text) {
            results.push({ title: topic.Text?.slice(0, 60) ?? "", url: topic.FirstURL ?? "", snippet: topic.Text ?? "" });
          }
        }
      }

      return {
        success: true,
        data: { query, results, totalResults: results.length, engine: "duckduckgo_fallback" },
        summary: `"${query}" için ${results.length} sonuç bulundu`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Arama hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`, error: String(err) };
    }
  },
};

export const crawlMarkdownTool: AgentTool = {
  name: "crawl_markdown",
  description: "crawl4ai servisiyle URL'yi temiz markdown olarak çıkar. Uzun web sayfalarını okunur hale getirir.",
  parameters: [
    { name: "url", type: "string", description: "Crawl edilecek URL", required: true },
    { name: "maxLength", type: "number", description: "Maksimum içerik uzunluğu. Varsayılan: 4000", required: false },
    { name: "includeLinks", type: "boolean", description: "Linkleri dahil et. Varsayılan: false", required: false },
  ],
  execute: async (params) => {
    const url = params.url as string;
    if (!url) {
      return { success: false, data: null, summary: "URL gerekli", error: "Missing URL" };
    }

    try {
      const baseUrl = process.env.CRAWL4AI_URL ?? "http://localhost:8002";
      const payload = await postJson<{
        success: boolean;
        url: string;
        title?: string;
        content?: string;
        word_count?: number;
        links?: string[];
      }>(`${baseUrl}/crawl`, {
        url,
        max_length: (params.maxLength as number) ?? 4000,
        include_links: params.includeLinks === true,
        cache: true,
      });

      return {
        success: true,
        data: payload,
        summary: `${payload.title ?? url} için markdown crawl tamamlandı (${payload.word_count ?? 0} kelime)`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Crawl hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`, error: String(err) };
    }
  },
};

export const browserExtractPageTool: AgentTool = {
  name: "browser_extract_page",
  description: "Playwright ile sayfayı gerçek browser'da açar, başlık ve görünür metni çıkarır. WebArena/OSWorld benzeri görevler için kullan.",
  parameters: [
    { name: "url", type: "string", description: "Açılacak URL", required: true },
    { name: "instruction", type: "string", description: "Neyi çıkarması gerektiği hakkında kısa yönerge", required: false },
    { name: "maxLength", type: "number", description: "Maksimum metin uzunluğu. Varsayılan: 3000", required: false },
    { name: "authenticated", type: "boolean", description: "İç Atlas yüzeyleri için oturum açılmış browser lane kullan", required: false },
    { name: "surface", type: "string", description: "auth surface: admin veya portal", required: false },
    { name: "authUserId", type: "string", description: "Magic link üretilecek kullanıcı id", required: false },
    { name: "reuseSession", type: "boolean", description: "Kayıtlı browser oturumunu yeniden kullan", required: false },
  ],
  execute: async (params, ctx) => {
    const rawUrl = params.url as string;
    const url = rawUrl.startsWith("/") ? new URL(rawUrl, getAppBaseUrl()).toString() : rawUrl;
    if (!url) {
      return { success: false, data: null, summary: "URL gerekli", error: "Missing URL" };
    }

    try {
      const { chromium } = await import("@playwright/test");
      const browser = await chromium.launch({ headless: true });
      let page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

      const authenticated = params.authenticated === true || isAtlasInternalUrl(url);
      const requestedSurface = params.surface === "admin" || params.surface === "portal"
        ? params.surface
        : url.includes("/admin")
          ? "admin"
          : url.includes("/panel")
            ? "portal"
            : "admin";

      let sessionReused = false;

      if (authenticated) {
        const authResult = await authenticateAtlasPage({
          page,
          browser,
          ctx,
          targetUrl: url,
          surface: requestedSurface,
          authUserId: typeof params.authUserId === "string" ? params.authUserId : undefined,
          reuseSession: params.reuseSession !== false,
        });
        page = authResult.page;
        sessionReused = authResult.sessionReused;
      } else {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      }

      const title = await page.title();
      const text = await page.locator("body").innerText();
      const links = await page.locator("a[href]").evaluateAll((elements) =>
        elements.slice(0, 12).map((element) => ({
          text: element.textContent?.trim() ?? "",
          href: element.getAttribute("href") ?? "",
        })),
      );

      const screenshotPath = path.join(
        getArtifactOutputRoot(),
        "output",
        "playwright",
        `operator-capture-${Date.now()}.png`,
      );
      await ensureDirectoryForFile(screenshotPath);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      await browser.close();

      const maxLength = (params.maxLength as number) ?? 3000;
      const instruction = params.instruction as string | undefined;
      const content = truncateText(text, maxLength);

      return {
        success: true,
        data: {
          url,
          title,
          instruction: instruction ?? null,
          content,
          links,
          authenticatedSession: authenticated,
          surface: authenticated ? requestedSurface : null,
          sessionReused,
          screenshotPath,
        },
        summary: `${title} sayfası browser ile açıldı ve görünür içerik çıkarıldı${authenticated ? " (authenticated lane)" : ""}`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Browser extract hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`, error: String(err) };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANALYSIS TOOLS — Deep platform analysis
// ═══════════════════════════════════════════════════════════════════════════

export const platformHealthTool: AgentTool = {
  name: "platform_health",
  description: "Platform sağlık durumunu detaylı analiz et. Sipariş, müşteri, destek, envanter, gelir metrikleri.",
  parameters: [],
  execute: async (_params, ctx) => {
    try {
      // Parallel queries for speed
      const [orders, users, tickets, companies, financial] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("orders").select("id,status,total_amount,created_at", { count: "exact" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("users").select("id,created_at", { count: "exact" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("support_tickets").select("id,status,priority", { count: "exact" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("customer_companies").select("id,status,company_type", { count: "exact" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("financial_records").select("record_type,amount,category"),
      ]);

      const totalOrders = orders.count ?? orders.data?.length ?? 0;
      const totalUsers = users.count ?? users.data?.length ?? 0;
      const totalTickets = tickets.count ?? tickets.data?.length ?? 0;
      const totalCompanies = companies.count ?? companies.data?.length ?? 0;

      let totalIncome = 0, totalExpense = 0;
      for (const r of (financial.data ?? []) as Array<{ record_type: string; amount: number }>) {
        if (r.record_type === "income") totalIncome += Number(r.amount) || 0;
        else totalExpense += Number(r.amount) || 0;
      }

      const openTickets = (tickets.data as Array<{ status: string }>)?.filter(t => t.status === "open" || t.status === "in_progress").length ?? 0;
      const activeCompanies = (companies.data as Array<{ status: string }>)?.filter(c => c.status === "active").length ?? 0;

      const health = {
        orders: { total: totalOrders, data: orders.data?.slice(0, 5) },
        users: { total: totalUsers },
        tickets: { total: totalTickets, open: openTickets },
        companies: { total: totalCompanies, active: activeCompanies },
        financial: { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense },
      };

      return {
        success: true,
        data: health,
        summary: `Platform: ${totalUsers} kullanıcı, ${totalOrders} sipariş, ${totalCompanies} şirket (${activeCompanies} aktif), ${openTickets} açık ticket, Gelir: $${totalIncome}, Gider: $${totalExpense}, Kâr: $${totalIncome - totalExpense}`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const trendAnalysisTool: AgentTool = {
  name: "trend_analysis",
  description: "Belirli bir metrik için trend analizi yap. Zaman serisi verisini analiz et.",
  parameters: [
    { name: "metric", type: "string", description: "Metrik: orders, users, revenue, tickets, companies", required: true },
    { name: "days", type: "number", description: "Kaç günlük veri? Varsayılan: 30", required: false },
  ],
  execute: async (params, ctx) => {
    const metric = params.metric as string;
    const days = (params.days as number) ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const tableMap: Record<string, string> = {
      orders: "orders",
      users: "users",
      revenue: "financial_records",
      tickets: "support_tickets",
      companies: "customer_companies",
    };
    const table = tableMap[metric] ?? "orders";

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (ctx.supabase as any)
        .from(table)
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (error) return { success: false, data: null, summary: `Trend hatası: ${error.message}`, error: error.message };

      // Group by day
      const byDay: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ created_at: string }>) {
        const day = row.created_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }

      const dayEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
      const total = dayEntries.reduce((s, [, c]) => s + c, 0);
      const avg = dayEntries.length > 0 ? total / dayEntries.length : 0;

      // Calculate trend direction
      let trendDirection = "stable";
      if (dayEntries.length >= 7) {
        const firstHalf = dayEntries.slice(0, Math.floor(dayEntries.length / 2));
        const secondHalf = dayEntries.slice(Math.floor(dayEntries.length / 2));
        const firstAvg = firstHalf.reduce((s, [, c]) => s + c, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, [, c]) => s + c, 0) / secondHalf.length;
        if (secondAvg > firstAvg * 1.1) trendDirection = "increasing";
        else if (secondAvg < firstAvg * 0.9) trendDirection = "decreasing";
      }

      return {
        success: true,
        data: { metric, days, byDay, total, dailyAverage: Math.round(avg * 100) / 100, trend: trendDirection, dataPoints: dayEntries.length },
        summary: `${metric} trendi (${days} gün): Toplam ${total}, Günlük ort. ${avg.toFixed(1)}, Trend: ${trendDirection}`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. CONTENT TOOLS — Generate text, reports
// ═══════════════════════════════════════════════════════════════════════════

export const generateContentTool: AgentTool = {
  name: "generate_content",
  description: "LLM ile içerik üret. Blog yazısı, sosyal medya postu, e-posta, rapor, reklam metni — herhangi bir metin.",
  parameters: [
    { name: "type", type: "string", description: "İçerik tipi: social_post, email, blog, report, ad_copy, notification", required: true },
    { name: "topic", type: "string", description: "İçerik konusu/talimatı", required: true },
    { name: "tone", type: "string", description: "Ton: professional, casual, urgent, friendly. Varsayılan: professional", required: false },
    { name: "language", type: "string", description: "Dil: tr, en. Varsayılan: tr", required: false },
    { name: "maxLength", type: "number", description: "Max karakter. Varsayılan: 500", required: false },
  ],
  execute: async (params) => {
    const type = params.type as string;
    const topic = params.topic as string;
    const tone = (params.tone as string) ?? "professional";
    const language = (params.language as string) ?? "tr";
    const maxLength = (params.maxLength as number) ?? 500;

    const systemMap: Record<string, string> = {
      social_post: `Sen sosyal medya uzmanısın. ${language === "tr" ? "Türkçe" : "İngilizce"} yaz. Hedef: ABD pazarına giren Türk girişimciler. Ton: ${tone}. Hashtag ekle.`,
      email: `Sen profesyonel e-posta yazarısın. ${language === "tr" ? "Türkçe" : "İngilizce"} yaz. Ton: ${tone}. Konu satırı + gövde yaz.`,
      blog: `Sen blog yazarısın. ${language === "tr" ? "Türkçe" : "İngilizce"} yaz. SEO uyumlu, başlıklı, paragraftaflı.`,
      report: `Sen iş analisti raporçusun. ${language === "tr" ? "Türkçe" : "İngilizce"} yaz. Veri odaklı, net, aksiyona yönelik.`,
      ad_copy: `Sen reklam metin yazarısın. ${language === "tr" ? "Türkçe" : "İngilizce"} yaz. Kısa, vurucu, CTA içeren metinler.`,
      notification: `Kısa ve net bildirim metni yaz. Max 200 karakter. ${language === "tr" ? "Türkçe" : "İngilizce"}.`,
    };

    try {
      const text = await llm(
        systemMap[type] ?? systemMap.report,
        topic,
        Math.ceil(maxLength / 3),
      );

      return {
        success: true,
        data: { type, text, charCount: text.length, language, tone },
        summary: `${type} içeriği oluşturuldu (${text.length} karakter)`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `İçerik üretim hatası: ${String(err)}`, error: String(err) };
    }
  },
};

export const analyzeTextTool: AgentTool = {
  name: "analyze_text",
  description: "Verilen metni LLM ile analiz et. Özetle, sınıflandır, duygu analizi yap.",
  parameters: [
    { name: "text", type: "string", description: "Analiz edilecek metin", required: true },
    { name: "task", type: "string", description: "Görev: summarize, classify, sentiment, extract_keywords, translate", required: true },
  ],
  execute: async (params) => {
    const text = params.text as string;
    const task = params.task as string;

    const taskPrompts: Record<string, string> = {
      summarize: `Bu metni 2-3 cümleyle özetle:\n\n${text}`,
      classify: `Bu metni kategorile (müşteri, operasyon, pazarlama, finans, teknik):\n\n${text}`,
      sentiment: `Bu metnin duygu analizini yap (pozitif/negatif/nötr) ve neden:\n\n${text}`,
      extract_keywords: `Bu metinden anahtar kelimeleri çıkar (virgülle ayrılmış):\n\n${text}`,
      translate: `Bu metni İngilizce'ye çevir:\n\n${text}`,
    };

    try {
      const result = await llm(
        "Sen metin analiz uzmanısın. Kısa ve net yanıtla.",
        taskPrompts[task] ?? text,
        300,
      );

      return {
        success: true,
        data: { task, result, inputLength: text.length },
        summary: `Metin analizi tamamlandı (${task}): ${result.slice(0, 100)}...`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Analiz hatası: ${String(err)}`, error: String(err) };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. PLATFORM / ACTION TOOLS
// ═══════════════════════════════════════════════════════════════════════════

export const sendNotificationTool: AgentTool = {
  name: "send_notification",
  description: "Supabase'deki notifications tablosuna bildirim ekle. Gerçek bildirim gönderir.",
  parameters: [
    { name: "title", type: "string", description: "Bildirim başlığı", required: true },
    { name: "body", type: "string", description: "Bildirim içeriği", required: true },
    { name: "type", type: "string", description: "Tip: info, warning, success, error. Varsayılan: info", required: false },
    { name: "userId", type: "string", description: "Hedef kullanıcı ID. Varsayılan: system", required: false },
  ],
  execute: async (params, ctx) => {
    const title = params.title as string;
    const body = params.body as string;
    const type = (params.type as string) ?? "info";
    const userId = (params.userId as string) ?? "system";

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (ctx.supabase as any).from("notifications").insert({
        user_id: userId,
        title,
        body,
        type,
        channel: "in_app",
        is_read: false,
      }).select().single();

      if (error) return { success: false, data: null, summary: `Bildirim hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: { notificationId: data?.id, title, type },
        summary: `Bildirim gönderildi: "${title}"`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const getTableSchemaTool: AgentTool = {
  name: "get_table_schema",
  description: "Veritabanı tablo yapısını göster. Hangi tablolar var, kolonları neler — şema bilgisi.",
  parameters: [
    { name: "table", type: "string", description: "Tablo adı. Boş bırakırsan tüm tabloları listeler.", required: false },
  ],
  execute: async (params, ctx) => {
    const table = params.table as string;

    // Known tables from the Atlas schema
    const knownTables: Record<string, string[]> = {
      users: ["id", "email", "full_name", "avatar_url", "phone", "status", "created_at"],
      customer_companies: ["id", "user_id", "company_name", "company_type", "status", "ein_number", "state_of_formation", "created_at"],
      orders: ["id", "user_id", "company_id", "order_type", "status", "total_amount", "currency", "created_at"],
      products: ["id", "user_id", "product_name", "sku", "category", "price", "currency", "stock_quantity", "status"],
      financial_records: ["id", "user_id", "record_type", "category", "amount", "currency", "description", "transaction_date"],
      notifications: ["id", "user_id", "title", "body", "type", "channel", "is_read", "action_url", "created_at"],
      support_tickets: ["id", "user_id", "subject", "description", "status", "priority", "category", "created_at"],
      contact_submissions: ["id", "full_name", "email", "phone", "subject", "message", "status", "created_at"],
      social_media_accounts: ["id", "user_id", "company_id", "platform", "account_name", "status", "followers_count", "engagement_rate"],
      marketplace_stores: ["id", "user_id", "company_id", "marketplace_name", "store_name", "status", "store_url"],
      inventory_items: ["id", "user_id", "product_id", "warehouse_id", "quantity", "reserved_quantity", "status"],
      warehouse_locations: ["id", "user_id", "warehouse_name", "location", "capacity", "status"],
      ad_campaigns: ["id", "user_id", "company_id", "campaign_name", "platform", "status", "daily_budget", "total_budget", "spent_amount"],
      shipments: ["id", "user_id", "order_id", "tracking_number", "carrier", "status", "origin", "destination"],
      agent_conversations: ["id", "user_id", "session_id", "role", "content", "token_count", "metadata", "created_at"],
    };

    if (table) {
      const columns = knownTables[table];
      if (!columns) {
        // Try querying the table to discover columns
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (ctx.supabase as any).from(table).select("*").limit(1);
          if (error) return { success: false, data: null, summary: `Tablo bulunamadı: ${table}`, error: error.message };
          const cols = data && data[0] ? Object.keys(data[0]) : [];
          return { success: true, data: { table, columns: cols }, summary: `${table}: ${cols.join(", ")}` };
        } catch {
          return { success: false, data: null, summary: `Tablo bulunamadı: ${table}`, error: "Table not found" };
        }
      }
      return { success: true, data: { table, columns }, summary: `${table}: ${columns.join(", ")}` };
    }

    return {
      success: true,
      data: { tables: Object.keys(knownTables), count: Object.keys(knownTables).length },
      summary: `${Object.keys(knownTables).length} tablo mevcut: ${Object.keys(knownTables).join(", ")}`,
    };
  },
};

export const saveMemoryTool: AgentTool = {
  name: "save_memory",
  description: "Uzun süreli hafızaya bilgi kaydet. Sonraki konuşmalarda hatırlanacak. Kararları, tercihleri, önemli bilgileri kaydet.",
  parameters: [
    { name: "key", type: "string", description: "Hafıza anahtarı (örn: 'user_preference', 'business_goal', 'decision')", required: true },
    { name: "value", type: "string", description: "Kaydedilecek bilgi", required: true },
    { name: "category", type: "string", description: "Kategori: preference, decision, fact, goal, context. Varsayılan: fact", required: false },
  ],
  execute: async (params, ctx) => {
    const key = params.key as string;
    const value = params.value as string;
    const category = (params.category as string) ?? "fact";

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (ctx.supabase as any).from("agent_conversations").insert({
        user_id: ctx.userId,
        session_id: `memory_${ctx.sessionId}`,
        role: "system",
        content: JSON.stringify({ type: "memory", key, value, category, savedAt: Date.now() }),
        token_count: Math.ceil(value.length / 4),
        metadata: { type: "long_term_memory", key, category },
      });

      if (error) return { success: false, data: null, summary: `Hafıza kayıt hatası: ${error.message}`, error: error.message };

      return {
        success: true,
        data: { key, category, saved: true },
        summary: `Hafızaya kaydedildi: [${category}] ${key} = "${value.slice(0, 50)}..."`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const recallMemoryTool: AgentTool = {
  name: "recall_memory",
  description: "Uzun süreli hafızadan bilgi getir. Önceki konuşmalardan kararları, tercihleri, bilgileri hatırla.",
  parameters: [
    { name: "query", type: "string", description: "Ne hatırlamak istiyorsun? Anahtar kelime veya konu.", required: true },
    { name: "limit", type: "number", description: "Max sonuç sayısı. Varsayılan: 10", required: false },
  ],
  execute: async (params, ctx) => {
    const query = (params.query as string) ?? "";
    const limit = (params.limit as number) ?? 10;

    try {
      // Get all memory entries for this user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (ctx.supabase as any)
        .from("agent_conversations")
        .select("content, metadata, created_at")
        .eq("user_id", ctx.userId)
        .eq("role", "system")
        .order("created_at", { ascending: false })
        .limit(limit * 3);

      if (error) return { success: false, data: null, summary: `Hafıza okuma hatası: ${error.message}`, error: error.message };

      // Filter memory entries and search
      const memories: Array<{ key: string; value: string; category: string; savedAt: string }> = [];

      for (const row of (data ?? []) as Array<{ content: string; metadata: Record<string, unknown>; created_at: string }>) {
        try {
          const parsed = JSON.parse(row.content);
          if (parsed.type === "memory") {
            const matches = !query || 
              parsed.key?.toLowerCase().includes(query.toLowerCase()) ||
              parsed.value?.toLowerCase().includes(query.toLowerCase()) ||
              parsed.category?.toLowerCase().includes(query.toLowerCase());

            if (matches) {
              memories.push({
                key: parsed.key,
                value: parsed.value,
                category: parsed.category,
                savedAt: row.created_at,
              });
            }
          }
        } catch { /* not a memory entry */ }
      }

      return {
        success: true,
        data: { memories: memories.slice(0, limit), total: memories.length, query },
        summary: memories.length > 0
          ? `${memories.length} hafıza kaydı bulundu: ${memories.map(m => m.key).join(", ")}`
          : `"${query}" için hafıza kaydı bulunamadı`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

export const runCustomQueryTool: AgentTool = {
  name: "run_custom_query",
  description: "Birden fazla tabloyu sorgulayıp birleştir. Karmaşık analizler için birden fazla veri kaynağını kombine et.",
  parameters: [
    { name: "queries", type: "array", description: "Sorgu listesi: [{table, select, filters, limit}]", required: true },
  ],
  execute: async (params, ctx) => {
    const queries = params.queries as Array<{ table: string; select?: string; filters?: Record<string, unknown>; limit?: number }>;
    if (!queries || !Array.isArray(queries)) return { success: false, data: null, summary: "Sorgu listesi gerekli", error: "Missing queries" };

    const results: Record<string, unknown> = {};

    for (const q of queries) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (ctx.supabase as any).from(q.table).select(q.select ?? "*").limit(q.limit ?? 10);
        if (q.filters) {
          for (const [key, val] of Object.entries(q.filters)) {
            if (val !== undefined) query = query.eq(key, val);
          }
        }
        const { data, error } = await query;
        results[q.table] = error ? { error: error.message } : { data, count: data?.length ?? 0 };
      } catch (err) {
        results[q.table] = { error: String(err) };
      }
    }

    const tables = Object.keys(results);
    return {
      success: true,
      data: results,
      summary: `${tables.length} tablo sorgulandı: ${tables.join(", ")}`,
    };
  },
};

export const calculateMetricsTool: AgentTool = {
  name: "calculate_metrics",
  description: "İş metrikleri hesapla: dönüşüm oranı, büyüme, churn, ARPU, LTV, CAC gibi KPI'lar.",
  parameters: [
    { name: "metric", type: "string", description: "Hesaplanacak metrik: conversion_rate, growth, arpu, churn, ltv, cac, overview", required: true },
  ],
  execute: async (params, ctx) => {
    const metric = params.metric as string;

    try {
      // Get base data
      const [usersRes, ordersRes, financialRes, companiesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("users").select("id, created_at"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("orders").select("id, user_id, total_amount, status, created_at"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("financial_records").select("record_type, amount, transaction_date"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any).from("customer_companies").select("id, status, created_at"),
      ]);

      const users = (usersRes.data ?? []) as Array<{ id: string; created_at: string }>;
      const orders = (ordersRes.data ?? []) as Array<{ id: string; user_id: string; total_amount: number; status: string; created_at: string }>;
      const financial = (financialRes.data ?? []) as Array<{ record_type: string; amount: number; transaction_date: string }>;
      const companies = (companiesRes.data ?? []) as Array<{ id: string; status: string; created_at: string }>;

      const totalRevenue = financial.filter(f => f.record_type === "income").reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const totalExpense = financial.filter(f => f.record_type === "expense").reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const activeCompanies = companies.filter(c => c.status === "active").length;
      const completedOrders = orders.filter(o => o.status === "completed" || o.status === "delivered").length;

      const metrics: Record<string, unknown> = {
        totalUsers: users.length,
        totalOrders: orders.length,
        completedOrders,
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        totalCompanies: companies.length,
        activeCompanies,
        conversionRate: users.length > 0 ? (completedOrders / users.length * 100).toFixed(1) + "%" : "0%",
        arpu: users.length > 0 ? (totalRevenue / users.length).toFixed(2) : "0",
        orderRate: users.length > 0 ? (orders.length / users.length).toFixed(2) : "0",
      };

      return {
        success: true,
        data: metrics,
        summary: `KPI'lar: ${users.length} kullanıcı, ${orders.length} sipariş, Dönüşüm: ${metrics.conversionRate}, ARPU: $${metrics.arpu}, Gelir: $${totalRevenue}`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Hata: ${String(err)}`, error: String(err) };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY — All available tools
// ═══════════════════════════════════════════════════════════════════════════

export function getAllAgentTools(): AgentTool[] {
  // Lazy-load Jarvis tools to avoid circular deps at module init
  let jarvisTools: AgentTool[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jt = require("@/lib/ai/tools/jarvis-tools");
    if (typeof jt.getJarvisAgentTools === "function") {
      jarvisTools = jt.getJarvisAgentTools();
    }
  } catch { /* jarvis tools optional */ }

  return [
    // Data
    queryDatabaseTool,
    countRecordsTool,
    insertRecordTool,
    updateRecordTool,
    deleteRecordTool,
    runCustomQueryTool,
    getTableSchemaTool,
    // Web
    fetchWebPageTool,
    webSearchTool,
    crawlMarkdownTool,
    browserExtractPageTool,
    // Analysis
    platformHealthTool,
    trendAnalysisTool,
    calculateMetricsTool,
    // Content
    generateContentTool,
    analyzeTextTool,
    // Platform
    sendNotificationTool,
    // Memory
    saveMemoryTool,
    recallMemoryTool,
    // Jarvis Observer
    ...jarvisTools,
  ];
}

/**
 * Select the most relevant tools based on the query.
 * Returns all tools if the query is broad.
 */
export function selectAgentTools(query: string): AgentTool[] {
  const all = filterSelectableAgentTools(getAllAgentTools());
  const q = query.toLowerCase();

  // Always include all tools — the LLM decides which to use.
  // For smaller models, we could filter, but let's start with all.
  // The ReAct engine only calls one tool at a time anyway.
  
  // Score tools by relevance
  const scored = all.map(t => {
    let score = 0;
    const desc = (t.name + " " + t.description).toLowerCase();
    
    // Check if query terms appear in tool name/description
    const words = q.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      if (desc.includes(word)) score += 2;
    }
    
    return { tool: t, score };
  });

  // Always return all tools, but sorted by relevance
  return scored.sort((a, b) => b.score - a.score).map(s => s.tool);
}
