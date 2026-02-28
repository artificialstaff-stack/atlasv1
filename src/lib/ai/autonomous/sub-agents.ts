// ─── Atlas Autonomous AI — Sub-Agent System ─────────────────────────────────
// Each sub-agent is a specialized AI worker.
// They receive tasks, use the local LLM to reason/generate, and return results.
//
// Architecture: Registry pattern — each agent type maps to an executor function.
// Agents use the existing copilot infrastructure (data-queries, deep-analysis, etc.)
// but with autonomous decision-making capability.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chatModel } from "@/lib/ai/client";
import type { AgentTask, SubAgentType } from "./types";
import { fetchDomainData } from "@/lib/ai/copilot/data-queries";
import { runDeepAnalysis, formatAnalysisForPrompt } from "@/lib/ai/copilot/deep-analysis";
import { detectActions, executeAction } from "@/lib/ai/copilot/actions";

type Db = SupabaseClient<Database>;

// ─── Agent Context ──────────────────────────────────────────────────────────

interface AgentContext {
  planGoal: string;
  previousOutputs: Record<string, unknown>;
  command: string;
}

// ─── Agent Names (Turkish) ──────────────────────────────────────────────────

const AGENT_NAMES: Record<SubAgentType, string> = {
  planner: "Planlama Ajanı",
  researcher: "Araştırma Ajanı",
  writer: "Yazar Ajanı",
  designer: "Tasarım Ajanı",
  video_producer: "Video Yapımcısı",
  social_manager: "Sosyal Medya Yöneticisi",
  analyst: "Analiz Ajanı",
  operator: "Operasyon Ajanı",
  notifier: "Bildirim Ajanı",
  quality_checker: "Kalite Kontrol Ajanı",
  scheduler: "Zamanlama Ajanı",
  monitor: "İzleme Ajanı",
};

const AGENT_EMOJIS: Record<SubAgentType, string> = {
  planner: "🧠",
  researcher: "🔍",
  writer: "✍️",
  designer: "🎨",
  video_producer: "🎬",
  social_manager: "📱",
  analyst: "📊",
  operator: "⚙️",
  notifier: "🔔",
  quality_checker: "✅",
  scheduler: "⏰",
  monitor: "👁️",
};

export function getAgentName(type: SubAgentType): string {
  return AGENT_NAMES[type] ?? type;
}

export function getAgentEmoji(type: SubAgentType): string {
  return AGENT_EMOJIS[type] ?? "🤖";
}

// ─── LLM Helper ─────────────────────────────────────────────────────────────

async function runLLM(system: string, prompt: string, maxTokens = 1024): Promise<string> {
  const result = streamText({
    model: chatModel,
    system,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    maxOutputTokens: maxTokens,
  });

  let text = "";
  for await (const chunk of result.textStream) {
    text += chunk;
  }
  return text.trim();
}

// ─── Agent Executors ────────────────────────────────────────────────────────

type AgentExecutor = (
  task: AgentTask,
  supabase: Db,
  context: AgentContext,
) => Promise<Record<string, unknown>>;

// ── Researcher Agent ────────────────────────────────────────────────────────

const researcherAgent: AgentExecutor = async (task, supabase, context) => {
  const action = task.action;

  if (action === "fetch_domain_data") {
    const domains = (task.input.domains as string[]) ?? ["customer", "commerce"];
    const agentRoles = domains.map(d => {
      const mapping: Record<string, string> = {
        customer: "customer", commerce: "commerce", finance: "finance",
        operations: "operations", analysis: "strategy", social: "marketing",
        email: "marketing", content: "marketing", video: "marketing",
        image: "marketing",
      };
      return (mapping[d] ?? "strategy") as "customer" | "commerce" | "finance" | "operations" | "strategy" | "marketing";
    });

    const uniqueRoles = [...new Set(agentRoles)];
    const data = await fetchDomainData(uniqueRoles, supabase);

    const totalRecords = data.reduce((s, d) => s + d.recordCount, 0);
    return {
      summary: `${uniqueRoles.length} alandan ${totalRecords} kayıt çekildi`,
      domains: data.map(d => ({ agent: d.agent, label: d.label, records: d.recordCount })),
      data: Object.fromEntries(data.map(d => [d.agent, d.data])),
      totalRecords,
    };
  }

  if (action === "fetch_social_accounts") {
    // Fetch customer data for social media mapping
    const { data: customers } = await supabase
      .from("customer_companies")
      .select("id, company_name, company_type, status")
      .limit(50);

    return {
      summary: `${customers?.length ?? 0} müşteri sosyal medya bilgisi getirildi`,
      customers: customers ?? [],
    };
  }

  return { summary: "Araştırma tamamlandı" };
};

// ── Writer Agent ────────────────────────────────────────────────────────────

const writerAgent: AgentExecutor = async (task, _supabase, context) => {
  const action = task.action;

  if (action === "generate_content") {
    const contentType = (task.input.type as string) ?? "general";
    const query = (task.input.query as string) ?? context.planGoal;

    // Build previous context from dependencies
    let dataContext = "";
    if (context.previousOutputs) {
      for (const [, output] of Object.entries(context.previousOutputs)) {
        const out = output as Record<string, unknown>;
        if (out.summary) dataContext += `\n- ${out.summary}`;
        if (out.data) dataContext += `\nVeri: ${JSON.stringify(out.data).slice(0, 500)}`;
      }
    }

    const system = `Sen Atlas AI platformunun yazı ajanısın. Türkçe yazarsın.
${contentType === "social_post" ? `
Sosyal medya içeriği üretiyorsun. Kurallar:
- Dikkat çekici, kısa ve etkili ol
- Emoji kullan ama abartma
- Hashtag öner
- Hedef: ABD pazarına giren Türk girişimciler
- Ton: profesyonel ama samimi
` : `
Profesyonel iş içeriği üretiyorsun.
- Net, anlaşılır ve aksiyona yönelik ol
- Veriyi kullan, somut öneriler sun
`}

Mevcut veriler:${dataContext || " (veri yok)"}`;

    const text = await runLLM(system, query, 800);

    // Extract hashtags if social
    const hashtags = text.match(/#\w+/g) ?? [];

    return {
      summary: `${contentType} içerik oluşturuldu (${text.length} karakter)`,
      text,
      contentType,
      hashtags,
      content: {
        id: `content_${Date.now()}`,
        type: contentType,
        title: query.slice(0, 80),
        body: text,
        metadata: { language: "tr", tone: "professional", hashtags },
        quality: { overall: 0, dimensions: { relevance: 0, clarity: 0, engagement: 0, brandAlign: 0 }, issues: [], suggestions: [] },
        status: "draft",
        createdAt: Date.now(),
      },
    };
  }

  if (action === "generate_summary") {
    // Build summary from all previous outputs
    let contextText = "";
    for (const [key, output] of Object.entries(context.previousOutputs)) {
      const out = output as Record<string, unknown>;
      if (out.summary) contextText += `\n- ${out.summary}`;
      if (out.text && typeof out.text === "string") {
        contextText += `\n  ${(out.text as string).slice(0, 200)}`;
      }
    }

    if (!contextText) {
      return { summary: "Sonuç özeti hazırlandı", text: "İşlem tamamlandı." };
    }

    const text = await runLLM(
      "Sen Atlas AI platformunun yazar ajanısın. Tüm çalışmaların özetini oluşturuyorsun. Türkçe yaz, kısa ve net ol.",
      `Aşağıdaki otonom görev sonuçlarını özetle:\n${contextText}`,
      500,
    );

    return { summary: "Sonuç özeti hazırlandı", text };
  }

  return { summary: "Yazı görevi tamamlandı", text: "" };
};

// ── Designer Agent ──────────────────────────────────────────────────────────

const designerAgent: AgentExecutor = async (task, _supabase, context) => {
  const query = (task.input.query as string) ?? context.planGoal;

  const prompt = await runLLM(
    `Sen bir görsel yapay zeka prompt mühendisisin.
Verilen iş bağlamına göre DALL-E / Midjourney / Stable Diffusion için İngilizce prompt yaz.
Sadece prompt'u yaz, başka bir şey ekleme.
Format: "A professional [style] image of [subject], [details], [style modifiers]"`,
    `Bu iş ihtiyacı için görsel prompt oluştur: ${query}`,
    300,
  );

  return {
    summary: "Görsel prompt oluşturuldu",
    imagePrompt: prompt,
    content: {
      id: `img_${Date.now()}`,
      type: "image_prompt",
      title: "Görsel Prompt",
      body: prompt,
      metadata: { language: "en", tone: "creative" },
      status: "draft",
      createdAt: Date.now(),
    },
  };
};

// ── Video Producer Agent ────────────────────────────────────────────────────

const videoProducerAgent: AgentExecutor = async (task, _supabase, context) => {
  const query = (task.input.query as string) ?? context.planGoal;

  const script = await runLLM(
    `Sen profesyonel bir video içerik yapımcısısın.
Kısa iş videoları için senaryo ve storyboard yazıyorsun.
Türkçe yaz. Format:

## Video Senaryosu
**Süre:** [tahmini süre]
**Platform:** [hedef platform]
**Ton:** [ton]

### Sahne 1
- Görsel: [ne gösterilecek]
- Metin/Seslendirme: [ne söylenecek]
- Süre: [saniye]

### Sahne 2
...

### CTA (Call to Action)
[izleyiciden ne isteniyor]`,
    `Bu konu için kısa video senaryosu yaz: ${query}`,
    800,
  );

  return {
    summary: "Video senaryosu oluşturuldu",
    videoScript: script,
    content: {
      id: `video_${Date.now()}`,
      type: "video_script",
      title: "Video Senaryosu",
      body: script,
      metadata: { language: "tr", tone: "professional" },
      status: "draft",
      createdAt: Date.now(),
    },
  };
};

// ── Social Manager Agent ────────────────────────────────────────────────────

const socialManagerAgent: AgentExecutor = async (task, supabase, context) => {
  if (task.action === "prepare_posts") {
    // Collect content from previous phases
    const sourceTexts: string[] = [];
    for (const [, output] of Object.entries(context.previousOutputs)) {
      const out = output as Record<string, unknown>;
      if (out.text && typeof out.text === "string") sourceTexts.push(out.text);
      if (out.imagePrompt && typeof out.imagePrompt === "string") sourceTexts.push(`[Görsel]: ${out.imagePrompt}`);
      if (out.videoScript && typeof out.videoScript === "string") sourceTexts.push(`[Video]: ${out.videoScript.slice(0, 200)}`);
    }

    const sourceContent = sourceTexts.join("\n\n---\n\n") || context.planGoal;

    // Fetch social media accounts for targeting info
    const { data: socialAccounts } = await supabase
      .from("social_media_accounts")
      .select("id, platform, account_name, status")
      .eq("status", "active")
      .limit(20);

    const { data: customers } = await supabase
      .from("customer_companies")
      .select("id, company_name, company_type")
      .limit(10);

    // Generate platform-specific posts using LLM
    const channels = ["instagram", "linkedin", "twitter_x"] as const;
    const posts: Record<string, unknown>[] = [];

    for (const channel of channels) {
      const charLimit = channel === "twitter_x" ? 280 : channel === "instagram" ? 2200 : 3000;
      const style = channel === "twitter_x" ? "kısa, vurucu, hashtag'li" :
        channel === "instagram" ? "görsel odaklı, emoji'li, hikaye anlatan, hashtag'li" :
        "profesyonel, iş odaklı, network değeri sunan";

      const postText = await runLLM(
        `Sen profesyonel bir sosyal medya yöneticisisin. ${channel.toUpperCase()} için içerik yazıyorsun.
Hedef kitle: ABD pazarına giren Türk girişimciler.
Stil: ${style}
Karakter limiti: ${charLimit}
Sadece paylaşım metnini yaz, başka açıklama ekleme.`,
        `Bu içeriği ${channel} için adapte et:\n\n${sourceContent.slice(0, 800)}`,
        400,
      );

      posts.push({
        channel,
        text: postText,
        charCount: postText.length,
        hashtags: postText.match(/#\w+/g) ?? [],
        status: "awaiting_approval",
        createdAt: Date.now(),
      });
    }

    return {
      summary: `${posts.length} kanal için paylaşım hazırlandı: ${channels.join(", ")}`,
      posts,
      channels: [...channels],
      customers: customers ?? [],
      socialAccounts: socialAccounts ?? [],
      status: "awaiting_approval",
      text: posts.map(p => `**${(p.channel as string).toUpperCase()}**:\n${p.text}`).join("\n\n---\n\n"),
    };
  }

  if (task.action === "publish_approved") {
    // Collect prepared posts from previous tasks
    const preparedPosts: Record<string, unknown>[] = [];
    for (const [, output] of Object.entries(context.previousOutputs)) {
      const out = output as Record<string, unknown>;
      if (out.posts && Array.isArray(out.posts)) {
        preparedPosts.push(...(out.posts as Record<string, unknown>[]));
      }
    }

    if (preparedPosts.length === 0) {
      return { summary: "Yayınlanacak onaylı içerik bulunamadı", published: 0 };
    }

    // Log what would be published (real API integration would go here)
    const publishLog: string[] = [];
    for (const post of preparedPosts) {
      publishLog.push(`✓ ${(post.channel as string).toUpperCase()}: "${(post.text as string).slice(0, 60)}..."`);
    }

    return {
      summary: `${preparedPosts.length} paylaşım yayına hazır (onay bekliyor)`,
      published: 0,
      pendingPublish: preparedPosts.length,
      log: publishLog,
      text: `## Yayın Kuyruğu\n\n${publishLog.join("\n")}`,
      note: "Sosyal medya API entegrasyonu aktifleştirildikten sonra otomatik yayınlanacak. Şimdilik içerikler onay kuyruğuna eklendi.",
    };
  }

  return { summary: "Sosyal medya görevi tamamlandı" };
};

// ── Analyst Agent ───────────────────────────────────────────────────────────

const analystAgent: AgentExecutor = async (task, supabase, _context) => {
  if (task.action === "deep_analysis") {
    const analysis = await runDeepAnalysis(supabase);
    const formatted = formatAnalysisForPrompt(analysis);

    return {
      summary: `Derin analiz tamamlandı: Sağlık=${analysis.health.overall}/100, ${analysis.trends.length} trend, ${analysis.anomalies.length} anomali`,
      analysis: {
        health: analysis.health,
        trends: analysis.trends,
        anomalies: analysis.anomalies,
        predictions: analysis.predictions,
        correlations: analysis.correlations,
      },
      text: formatted,
    };
  }

  return { summary: "Analiz tamamlandı" };
};

// ── Operator Agent ──────────────────────────────────────────────────────────

const operatorAgent: AgentExecutor = async (task, supabase, context) => {
  const query = (task.input.query as string) ?? context.planGoal;
  const actions = detectActions(query);

  if (actions.length === 0) {
    return { summary: "Yürütülecek aksiyon tespit edilmedi", actionsExecuted: 0 };
  }

  const results = await Promise.all(
    actions.map(a => executeAction(supabase, a)),
  );

  const successful = results.filter(r => r.success).length;
  return {
    summary: `${successful}/${results.length} aksiyon yürütüldü`,
    actionsExecuted: successful,
    results: results.map(r => ({ type: r.type, success: r.success, message: r.description })),
  };
};

// ── Notifier Agent ──────────────────────────────────────────────────────────

const notifierAgent: AgentExecutor = async (task, supabase, context) => {
  // Collect summaries from all previous tasks for notification content
  const summaries: string[] = [];
  for (const [, output] of Object.entries(context.previousOutputs)) {
    const out = output as Record<string, unknown>;
    if (out.summary && typeof out.summary === "string") summaries.push(out.summary);
  }

  const notifContent = summaries.length > 0
    ? summaries.join("; ")
    : context.planGoal;

  // Generate notification text via LLM
  const notifText = await runLLM(
    "Sen Atlas AI bildirim ajanısın. Kısa ve net bildirim metni yazarsın. Türkçe yaz.",
    `Bu otonom görev sonuçlarını bildirim olarak özetle (max 200 karakter):\n${notifContent.slice(0, 500)}`,
    100,
  );

  // Insert real notification into Supabase
  const { error } = await supabase.from("notifications").insert({
    user_id: "system",
    type: "info",
    title: "Atlas AI Otonom Görev Tamamlandı",
    body: notifText.slice(0, 500),
    channel: "in_app",
    is_read: false,
  });

  if (error) {
    return {
      summary: `Bildirim oluşturma hatası: ${error.message}`,
      error: error.message,
    };
  }

  return {
    summary: `Bildirim oluşturuldu: "${notifText.slice(0, 60)}..."`,
    notificationText: notifText,
    status: "sent",
    text: notifText,
  };
};

// ── Quality Checker Agent ───────────────────────────────────────────────────

const qualityCheckerAgent: AgentExecutor = async (task, _supabase, context) => {
  // Collect all content from previous outputs
  const contents: string[] = [];
  for (const [, output] of Object.entries(context.previousOutputs)) {
    const out = output as Record<string, unknown>;
    if (out.text && typeof out.text === "string") contents.push(out.text);
    if (out.imagePrompt && typeof out.imagePrompt === "string") contents.push(out.imagePrompt);
    if (out.videoScript && typeof out.videoScript === "string") contents.push(out.videoScript);
  }

  if (contents.length === 0) {
    return { summary: "Kontrol edilecek içerik bulunamadı", quality: { overall: 0 } };
  }

  const review = await runLLM(
    `Sen bir içerik kalite kontrol uzmanısın.
İçeriği şu kriterlere göre değerlendir (0-100):
1. **Alakalılık** (relevance): İş bağlamına uygun mu?
2. **Netlik** (clarity): Anlaşılır mı?
3. **Etkileşim** (engagement): Dikkat çekici mi?
4. **Marka Uyumu** (brandAlign): Atlas markasına uygun mu?

Kısa değerlendirme yap ve puan ver. Format:
Relevance: [puan]
Clarity: [puan]  
Engagement: [puan]
BrandAlign: [puan]
Genel: [puan]
Sorunlar: [varsa]
Öneriler: [varsa]`,
    `Bu içeriği değerlendir:\n\n${contents.join("\n\n---\n\n")}`,
    400,
  );

  // Parse scores from LLM response
  const parseScore = (text: string, key: string): number => {
    const match = text.match(new RegExp(`${key}[:\\s]*(\\d{1,3})`, "i"));
    return match ? Math.min(100, parseInt(match[1])) : 70;
  };

  const quality = {
    overall: parseScore(review, "Genel"),
    dimensions: {
      relevance: parseScore(review, "Relevance"),
      clarity: parseScore(review, "Clarity"),
      engagement: parseScore(review, "Engagement"),
      brandAlign: parseScore(review, "BrandAlign"),
    },
    review,
  };

  return {
    summary: `Kalite kontrolü tamamlandı: ${quality.overall}/100`,
    quality,
    text: review,
  };
};

// ── Scheduler Agent ─────────────────────────────────────────────────────────

const schedulerAgent: AgentExecutor = async (task, _supabase, context) => {
  // Generate scheduling plan via LLM
  const scheduleDescription = await runLLM(
    `Sen Atlas AI zamanlama ajanısın. Kullanıcının istediği göreve göre zamanlama planı oluşturursun.
Türkçe yaz. Şu formatta yanıt ver:
- Görev Adı: [ne yapılacak]
- Tekrar: [günlük/haftalık/aylık]
- Başlangıç: [tarih/saat]
- Açıklama: [1 cümle]`,
    `Bu görev için zamanlama planı oluştur: ${context.planGoal}`,
    200,
  );

  return {
    summary: `Zamanlama planı oluşturuldu`,
    scheduledTask: {
      description: scheduleDescription,
      status: "scheduled",
      nextRun: Date.now() + 24 * 60 * 60 * 1000,
    },
    text: scheduleDescription,
  };
};

// ── Monitor Agent ───────────────────────────────────────────────────────────

const monitorAgent: AgentExecutor = async (task, supabase, _context) => {
  const analysis = await runDeepAnalysis(supabase);

  const alerts: Record<string, unknown>[] = [];
  for (const anomaly of analysis.anomalies) {
    alerts.push({
      type: "anomaly",
      severity: anomaly.severity === "critical" ? "critical" : "warning",
      title: anomaly.metric,
      message: anomaly.message,
    });
  }

  return {
    summary: `İzleme tamamlandı: ${alerts.length} uyarı, sağlık=${analysis.health.overall}/100`,
    alerts,
    health: analysis.health,
  };
};

// ─── Agent Registry ─────────────────────────────────────────────────────────

const AGENT_REGISTRY: Record<SubAgentType, AgentExecutor> = {
  planner: async () => ({ summary: "Plan oluşturuldu" }),
  researcher: researcherAgent,
  writer: writerAgent,
  designer: designerAgent,
  video_producer: videoProducerAgent,
  social_manager: socialManagerAgent,
  analyst: analystAgent,
  operator: operatorAgent,
  notifier: notifierAgent,
  quality_checker: qualityCheckerAgent,
  scheduler: schedulerAgent,
  monitor: monitorAgent,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/** Execute a task using the appropriate sub-agent */
export async function executeSubAgent(
  task: AgentTask,
  supabase: Db,
  context: AgentContext,
): Promise<Record<string, unknown>> {
  const executor = AGENT_REGISTRY[task.agent];
  if (!executor) {
    throw new Error(`Bilinmeyen ajan tipi: ${task.agent}`);
  }
  return executor(task, supabase, context);
}

/** Get all available agent types */
export function getAvailableAgents(): { type: SubAgentType; name: string; emoji: string }[] {
  return Object.entries(AGENT_NAMES).map(([type, name]) => ({
    type: type as SubAgentType,
    name,
    emoji: AGENT_EMOJIS[type as SubAgentType],
  }));
}
