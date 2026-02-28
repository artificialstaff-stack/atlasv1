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
    const contents: Record<string, unknown>[] = [];
    for (const [, output] of Object.entries(context.previousOutputs)) {
      const out = output as Record<string, unknown>;
      if (out.content) contents.push(out.content as Record<string, unknown>);
      if (out.text) {
        contents.push({
          type: "social_post",
          body: out.text,
          hashtags: out.hashtags ?? [],
        });
      }
    }

    // Fetch customers for targeting
    const { data: customers } = await supabase
      .from("customer_companies")
      .select("id, company_name, company_type")
      .limit(10);

    const channels = ["instagram", "linkedin", "twitter"];

    return {
      summary: `${contents.length} içerik ${channels.length} kanal için hazırlandı`,
      contents,
      channels,
      customers: customers ?? [],
      status: "awaiting_approval",
    };
  }

  if (task.action === "publish_approved") {
    // In production, this would actually call social media APIs
    return {
      summary: "Onaylanan içerikler yayına hazır (API entegrasyonu bekleniyor)",
      published: false,
      reason: "Sosyal medya API entegrasyonu henüz aktif değil. İçerik onay kuyruğuna eklendi.",
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

const notifierAgent: AgentExecutor = async (task, _supabase, context) => {
  // In production, this would send actual notifications
  return {
    summary: "Bildirim gönderilmeye hazır (API entegrasyonu bekleniyor)",
    notificationType: task.input.type ?? "email",
    recipients: task.input.recipients ?? [],
    status: "queued",
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
  return {
    summary: "Zamanlama görevi oluşturuldu (cron entegrasyonu bekleniyor)",
    scheduledTask: {
      description: task.description,
      status: "scheduled",
      nextRun: Date.now() + 24 * 60 * 60 * 1000, // tomorrow
    },
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
