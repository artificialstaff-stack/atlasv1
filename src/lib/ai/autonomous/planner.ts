// ─── Atlas Autonomous AI — Planner Agent ────────────────────────────────────
// The "brain" that decomposes any command into a multi-phase execution plan.
//
// Unlike simple task decomposition, this creates AUTONOMOUS WORKFLOWS:
//   1. Understand the goal (multi-language, multi-domain)
//   2. Break into phases with approval gates
//   3. Assign sub-agents to each task
//   4. Set dependencies between tasks
//   5. Estimate resources and time
//
// This is the "CEO" of agents — Claude/Manus level planning.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { plannerModel } from "@/lib/ai/client";
import type {
  AutonomousCommand,
  MasterPlan,
  Phase,
  AgentTask,
  SubAgentType,
  AutonomyLevel,
} from "./types";

// ─── Command Analysis ───────────────────────────────────────────────────────

interface CommandAnalysis {
  goal: string;
  domains: string[];
  requiresContent: boolean;
  requiresSocial: boolean;
  requiresAnalysis: boolean;
  requiresMutation: boolean;
  requiresNotification: boolean;
  requiresScheduling: boolean;
  complexity: "trivial" | "simple" | "moderate" | "complex" | "epic";
  autonomyLevel: AutonomyLevel;
}

const DOMAIN_SIGNALS: Record<string, { keywords: RegExp; domain: string }> = {
  social: { keywords: /sosyal\s*medya|instagram|facebook|twitter|linkedin|tiktok|youtube|paylaş|post|hikaye|story|reels/i, domain: "social" },
  content: { keywords: /içerik|yaz|oluştur|metin|prompt|kopya|reklam\s*metni|blog|makale|caption/i, domain: "content" },
  video: { keywords: /video|animasyon|kısa\s*video|reels|tiktok|youtube|senaryo|storyboard/i, domain: "video" },
  image: { keywords: /görsel|resim|fotoğraf|banner|poster|tasarım|design|image|grafik/i, domain: "image" },
  email: { keywords: /e-posta|email|mail|bülten|newsletter|gönder/i, domain: "email" },
  analysis: { keywords: /analiz|rapor|trend|anomali|sağlık|karşılaştır|istatistik|metrik|kpi/i, domain: "analysis" },
  customer: { keywords: /müşteri|kullanıcı|onboarding|churn|kayıt|abone/i, domain: "customer" },
  commerce: { keywords: /sipariş|ürün|stok|envanter|fiyat|indirim|kampanya/i, domain: "commerce" },
  finance: { keywords: /gelir|gider|fatura|ödeme|kâr|maliyet|bütçe/i, domain: "finance" },
  operations: { keywords: /destek|ticket|görev|süreç|workflow|otomasyon/i, domain: "operations" },
};

function analyzeCommand(input: string): CommandAnalysis {
  const lower = input.toLowerCase();
  const domains: string[] = [];

  for (const [, signal] of Object.entries(DOMAIN_SIGNALS)) {
    if (signal.keywords.test(lower)) {
      domains.push(signal.domain);
    }
  }

  if (domains.length === 0) domains.push("analysis"); // default

  const requiresContent = domains.some(d => ["content", "email", "social"].includes(d));
  const requiresSocial = domains.includes("social");
  const requiresAnalysis = domains.some(d => ["analysis", "customer", "commerce", "finance"].includes(d));
  const requiresMutation = /güncelle|değiştir|ekle|sil|oluştur|kur|yap|build|create|update|delete/i.test(lower);
  const requiresNotification = /bildir|notify|alert|uyar|gönder|send|mail/i.test(lower);
  const requiresScheduling = /her\s*(gün|hafta|ay|pazartesi|salı|çarşamba|perşembe|cuma)|zamanlı|schedule|otomatik|periyodik|tekrarla/i.test(lower);
  const requiresVideo = domains.includes("video");

  // Complexity scoring
  let complexityScore = domains.length;
  if (requiresContent) complexityScore += 1;
  if (requiresSocial) complexityScore += 2;
  if (requiresVideo) complexityScore += 3;
  if (requiresMutation) complexityScore += 1;
  if (requiresScheduling) complexityScore += 1;
  if (input.length > 200) complexityScore += 1;

  const complexity =
    complexityScore >= 8 ? "epic" :
    complexityScore >= 5 ? "complex" :
    complexityScore >= 3 ? "moderate" :
    complexityScore >= 2 ? "simple" : "trivial";

  // Autonomy level
  const autonomyLevel: AutonomyLevel =
    requiresSocial || requiresMutation ? "approval_required" :
    complexity === "epic" ? "supervised" :
    "full";

  // Goal extraction
  const goal = input.length > 100 ? input.slice(0, 100) + "..." : input;

  return {
    goal,
    domains,
    requiresContent,
    requiresSocial,
    requiresAnalysis,
    requiresMutation,
    requiresNotification,
    requiresScheduling,
    complexity,
    autonomyLevel,
  };
}

// ─── Plan Builder ───────────────────────────────────────────────────────────

function makeTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildPlan(command: AutonomousCommand, analysis: CommandAnalysis): MasterPlan {
  const phases: Phase[] = [];
  let phaseId = 1;

  // ── Phase 1: Research & Analysis (always runs first) ──────────────
  const researchTasks: AgentTask[] = [];

  if (analysis.requiresAnalysis || analysis.domains.some(d => ["customer", "commerce", "finance", "operations"].includes(d))) {
    researchTasks.push({
      id: makeTaskId(),
      phaseId: 1,
      agent: "researcher",
      action: "fetch_domain_data",
      description: "Veritabanından ilgili verileri çek",
      input: { domains: analysis.domains, query: command.input },
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 2,
    });
  }

  if (analysis.requiresAnalysis) {
    researchTasks.push({
      id: makeTaskId(),
      phaseId: 1,
      agent: "analyst",
      action: "deep_analysis",
      description: "Derin analiz yap: trend, anomali, sağlık skoru",
      input: { query: command.input },
      dependencies: researchTasks.length > 0 ? [researchTasks[0].id] : [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 1,
    });
  }

  if (analysis.requiresSocial) {
    researchTasks.push({
      id: makeTaskId(),
      phaseId: 1,
      agent: "researcher",
      action: "fetch_social_accounts",
      description: "Müşteri sosyal medya hesaplarını getir",
      input: { customerId: "all" },
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 2,
    });
  }

  if (researchTasks.length > 0) {
    phases.push({
      id: phaseId++,
      name: "Araştırma & Analiz",
      description: "Veri toplama, analiz ve bağlam oluşturma",
      tasks: researchTasks,
      status: "pending",
      gateType: "auto",
    });
  }

  // ── Phase 2: Content Generation ───────────────────────────────────
  if (analysis.requiresContent || analysis.requiresSocial) {
    const contentTasks: AgentTask[] = [];

    contentTasks.push({
      id: makeTaskId(),
      phaseId,
      agent: "writer",
      action: "generate_content",
      description: "İçerik oluştur (metin, başlık, açıklama)",
      input: { 
        type: analysis.requiresSocial ? "social_post" : "general",
        query: command.input,
        domains: analysis.domains,
      },
      dependencies: researchTasks.map(t => t.id),
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 2,
    });

    if (analysis.domains.includes("image") || analysis.requiresSocial) {
      contentTasks.push({
        id: makeTaskId(),
        phaseId,
        agent: "designer",
        action: "generate_image_prompt",
        description: "Görsel için prompt oluştur",
        input: { query: command.input },
        dependencies: [contentTasks[0].id],
        status: "pending",
        priority: 2,
        retries: 0,
        maxRetries: 1,
      });
    }

    if (analysis.domains.includes("video")) {
      contentTasks.push({
        id: makeTaskId(),
        phaseId,
        agent: "video_producer",
        action: "generate_video_script",
        description: "Video senaryo ve storyboard oluştur",
        input: { query: command.input },
        dependencies: [contentTasks[0].id],
        status: "pending",
        priority: 2,
        retries: 0,
        maxRetries: 1,
      });
    }

    // Quality check
    contentTasks.push({
      id: makeTaskId(),
      phaseId,
      agent: "quality_checker",
      action: "review_content",
      description: "İçerik kalite kontrolü",
      input: {},
      dependencies: contentTasks.map(t => t.id),
      status: "pending",
      priority: 3,
      retries: 0,
      maxRetries: 1,
    });

    phases.push({
      id: phaseId++,
      name: "İçerik Üretimi",
      description: "Metin, görsel prompt ve video senaryo oluşturma",
      tasks: contentTasks,
      status: "pending",
      gateType: analysis.requiresSocial ? "approval" : "auto",
    });
  }

  // ── Phase 3: Social Media Publishing ──────────────────────────────
  if (analysis.requiresSocial) {
    const socialTasks: AgentTask[] = [];

    socialTasks.push({
      id: makeTaskId(),
      phaseId,
      agent: "social_manager",
      action: "prepare_posts",
      description: "Sosyal medya paylaşımlarını hazırla",
      input: { channels: analysis.domains.filter(d => ["instagram", "facebook", "twitter", "linkedin", "tiktok"].includes(d)) },
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 1,
    });

    socialTasks.push({
      id: makeTaskId(),
      phaseId,
      agent: "social_manager",
      action: "publish_approved",
      description: "Onaylanan içerikleri paylaş",
      input: {},
      dependencies: [socialTasks[0].id],
      status: "pending",
      priority: 2,
      retries: 0,
      maxRetries: 2,
    });

    phases.push({
      id: phaseId++,
      name: "Sosyal Medya Yayını",
      description: "İçerik paylaşımı ve zamanlama",
      tasks: socialTasks,
      status: "pending",
      gateType: "approval",
    });
  }

  // ── Phase 4: Actions & Mutations ──────────────────────────────────
  if (analysis.requiresMutation) {
    const actionTasks: AgentTask[] = [];

    actionTasks.push({
      id: makeTaskId(),
      phaseId,
      agent: "operator",
      action: "execute_mutations",
      description: "Veritabanı işlemlerini yürüt",
      input: { query: command.input },
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 1,
    });

    phases.push({
      id: phaseId++,
      name: "Aksiyon Yürütme",
      description: "Veritabanı güncellemeleri ve işlemler",
      tasks: actionTasks,
      status: "pending",
      gateType: "approval",
    });
  }

  // ── Phase 5: Notifications ────────────────────────────────────────
  if (analysis.requiresNotification) {
    phases.push({
      id: phaseId++,
      name: "Bildirim Gönderimi",
      description: "E-posta ve bildirimleri gönder",
      tasks: [{
        id: makeTaskId(),
        phaseId,
        agent: "notifier",
        action: "send_notifications",
        description: "Bildirimleri gönder",
        input: { query: command.input },
        dependencies: [],
        status: "pending",
        priority: 1,
        retries: 0,
        maxRetries: 2,
      }],
      status: "pending",
      gateType: "approval",
    });
  }

  // ── Phase 6: Scheduling (if recurring) ────────────────────────────
  if (analysis.requiresScheduling) {
    phases.push({
      id: phaseId++,
      name: "Zamanlama",
      description: "Tekrarlayan görevleri zamanla",
      tasks: [{
        id: makeTaskId(),
        phaseId,
        agent: "scheduler",
        action: "create_schedule",
        description: "Zamanlanmış görevi oluştur",
        input: { query: command.input },
        dependencies: [],
        status: "pending",
        priority: 1,
        retries: 0,
        maxRetries: 1,
      }],
      status: "pending",
      gateType: "auto",
    });
  }

  // ── Final Phase: Report & Summarize ───────────────────────────────
  phases.push({
    id: phaseId,
    name: "Rapor & Özet",
    description: "Tüm sonuçları derle ve kullanıcıya sun",
    tasks: [{
      id: makeTaskId(),
      phaseId,
      agent: "writer",
      action: "generate_summary",
      description: "Sonuç raporu oluştur",
      input: {},
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 1,
    }],
    status: "pending",
    gateType: "auto",
  });

  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const estimatedMs = totalTasks * 2000 + (analysis.complexity === "epic" ? 10000 : 3000);

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    commandId: command.id,
    goal: analysis.goal,
    reasoning: buildReasoning(analysis),
    complexity: analysis.complexity,
    estimatedMs,
    phases,
    requiresApproval: analysis.autonomyLevel === "approval_required",
    autonomyLevel: analysis.autonomyLevel,
    status: "planning",
    createdAt: Date.now(),
  };
}

function buildReasoning(analysis: CommandAnalysis): string {
  const parts: string[] = [];
  parts.push(`Hedef: ${analysis.goal}`);
  parts.push(`Karmaşıklık: ${analysis.complexity}`);
  parts.push(`Etkilenen alanlar: ${analysis.domains.join(", ")}`);
  if (analysis.requiresContent) parts.push("İçerik üretimi gerekli");
  if (analysis.requiresSocial) parts.push("Sosyal medya paylaşımı gerekli (onay beklenir)");
  if (analysis.requiresMutation) parts.push("Veritabanı mutasyonu gerekli (onay beklenir)");
  if (analysis.requiresScheduling) parts.push("Tekrarlayan zamanlama oluşturulacak");
  return parts.join(" | ");
}

// ─── LLM-Enhanced Planning (for complex commands) ───────────────────────────

async function enhancePlanWithLLM(
  plan: MasterPlan,
  command: AutonomousCommand,
): Promise<string> {
  const systemPrompt = `Sen Atlas AI platformunun otonom planlama ajanısın.
Kullanıcı bir komut verdi ve sen bunu bir yürütme planına dönüştürüyorsun.
Türkçe yanıt ver. Kısa ve net ol.

Mevcut plan:
- Hedef: ${plan.goal}
- Fazlar: ${plan.phases.map(p => p.name).join(" → ")}
- Toplam görev: ${plan.phases.reduce((s, p) => s + p.tasks.length, 0)}
- Karmaşıklık: ${plan.complexity}
- Otonomi: ${plan.autonomyLevel}

Planın mantığını 2-3 cümlede açıkla.`;

  try {
    const result = streamText({
      model: plannerModel,
      system: systemPrompt,
      messages: [{ role: "user", content: command.input }],
      temperature: 0.3,
      maxOutputTokens: 300,
    });

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    return text.trim();
  } catch {
    return plan.reasoning;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Create a master plan from user command */
export async function createMasterPlan(command: AutonomousCommand): Promise<MasterPlan> {
  const analysis = analyzeCommand(command.input);
  const plan = buildPlan(command, analysis);

  // For complex plans, enhance reasoning with LLM
  if (analysis.complexity === "complex" || analysis.complexity === "epic") {
    plan.reasoning = await enhancePlanWithLLM(plan, command);
  }

  plan.status = plan.requiresApproval ? "awaiting_approval" : "executing";
  return plan;
}

/** Analyze a command without building full plan (for preview) */
export function analyzeCommandPreview(input: string): CommandAnalysis {
  return analyzeCommand(input);
}

export { type CommandAnalysis };
