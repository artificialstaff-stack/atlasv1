// ─── Atlas Autonomous AI — Workflow Engine ──────────────────────────────────
// Natural Language → Automated Workflow conversion and execution.
//
// Users describe what they want in plain language, and the engine:
// 1. Parses the intent
// 2. Creates a reusable workflow template
// 3. Executes steps with the sub-agent system
// 4. Supports triggers: manual, schedule, condition, db_event
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { chatModel } from "@/lib/ai/client";
import type {
  WorkflowTemplate,
  WorkflowTrigger,
  WorkflowStep,
  SubAgentType,
} from "./types";

// ─── Workflow Store ─────────────────────────────────────────────────────────

const workflows = new Map<string, WorkflowTemplate>();

// ─── Natural Language → Workflow ─────────────────────────────────────────────

export async function createWorkflowFromNL(description: string): Promise<WorkflowTemplate> {
  // Use LLM to parse the workflow description
  const result = streamText({
    model: chatModel,
    system: `Sen bir otomasyon mühendisisin. Kullanıcının doğal dil açıklamasını yapılandırılmış iş akışına dönüştürüyorsun.

JSON formatında yanıt ver:
{
  "name": "iş akışı adı",
  "description": "açıklama",
  "trigger": {
    "type": "manual|schedule|condition|db_event|alert",
    "config": {},
    "description": "tetikleyici açıklaması"
  },
  "steps": [
    {
      "id": 1,
      "agent": "researcher|writer|designer|video_producer|social_manager|analyst|operator|notifier|quality_checker|scheduler|monitor",
      "action": "eylem_adı",
      "params": {},
      "onFailure": "stop|skip|retry"
    }
  ]
}

Kurallar:
- Her adımı en uygun ajana ata
- Bağımlılıkları mantıksal sırala
- Hata durumunu belirle
- Tetikleme mantığını doğru seç`,
    messages: [{
      role: "user",
      content: `Bu iş akışını oluştur: ${description}`,
    }],
    temperature: 0.3,
    maxOutputTokens: 800,
  });

  let text = "";
  for await (const chunk of result.textStream) {
    text += chunk;
  }

  // Parse LLM response
  let parsed: Record<string, unknown> = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback to basic workflow
  }

  const trigger: WorkflowTrigger = {
    type: ((parsed.trigger as Record<string, unknown>)?.type as WorkflowTrigger["type"]) ?? "manual",
    config: ((parsed.trigger as Record<string, unknown>)?.config as Record<string, unknown>) ?? {},
    description: ((parsed.trigger as Record<string, unknown>)?.description as string) ?? description,
  };

  const rawSteps = (parsed.steps as Record<string, unknown>[]) ?? [];
  const steps: WorkflowStep[] = rawSteps.map((s, i) => ({
    id: (s.id as number) ?? i + 1,
    agent: (s.agent as SubAgentType) ?? "operator",
    action: (s.action as string) ?? "execute",
    params: (s.params as Record<string, unknown>) ?? {},
    onFailure: (s.onFailure as "stop" | "skip" | "retry") ?? "stop",
  }));

  // If parsing failed, create basic workflow
  if (steps.length === 0) {
    steps.push({
      id: 1,
      agent: "researcher",
      action: "fetch_data",
      params: { query: description },
      onFailure: "stop",
    });
    steps.push({
      id: 2,
      agent: "writer",
      action: "generate_content",
      params: { topic: description },
      onFailure: "stop",
    });
  }

  const workflow: WorkflowTemplate = {
    id: `workflow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: (parsed.name as string) ?? `İş Akışı: ${description.slice(0, 50)}`,
    description: (parsed.description as string) ?? description,
    trigger,
    steps,
    isActive: true,
    createdFrom: "natural_language",
    createdAt: Date.now(),
    runCount: 0,
  };

  workflows.set(workflow.id, workflow);
  return workflow;
}

// ─── Workflow Management ────────────────────────────────────────────────────

export function getWorkflow(id: string): WorkflowTemplate | undefined {
  return workflows.get(id);
}

export function getAllWorkflows(): WorkflowTemplate[] {
  return Array.from(workflows.values())
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getActiveWorkflows(): WorkflowTemplate[] {
  return getAllWorkflows().filter(w => w.isActive);
}

export function toggleWorkflow(id: string): WorkflowTemplate | null {
  const wf = workflows.get(id);
  if (!wf) return null;
  wf.isActive = !wf.isActive;
  return wf;
}

export function deleteWorkflow(id: string): boolean {
  return workflows.delete(id);
}

export function incrementWorkflowRun(id: string): void {
  const wf = workflows.get(id);
  if (wf) {
    wf.runCount++;
    wf.lastRunAt = Date.now();
  }
}

// ─── Predefined Workflow Templates ──────────────────────────────────────────

export function createPredefinedWorkflows(): void {
  // Social media content calendar
  const socialCalendar: WorkflowTemplate = {
    id: "workflow_social_calendar",
    name: "Haftalık Sosyal Medya İçerik Planı",
    description: "Her hafta başında otomatik içerik planı oluşturur ve onaya gönderir",
    trigger: {
      type: "schedule",
      config: { cron: "0 9 * * 1" }, // Every Monday 9am
      description: "Her Pazartesi sabah 9'da",
    },
    steps: [
      { id: 1, agent: "analyst", action: "analyze_trends", params: { period: "week" }, onFailure: "skip" },
      { id: 2, agent: "writer", action: "generate_content", params: { type: "social_post", count: 5 }, onFailure: "stop" },
      { id: 3, agent: "designer", action: "generate_image_prompt", params: { count: 5 }, onFailure: "skip" },
      { id: 4, agent: "quality_checker", action: "review_content", params: {}, onFailure: "skip" },
      { id: 5, agent: "social_manager", action: "prepare_posts", params: { channels: ["instagram", "linkedin"] }, onFailure: "stop" },
    ],
    isActive: false,
    createdFrom: "ai_suggested",
    createdAt: Date.now(),
    runCount: 0,
  };
  workflows.set(socialCalendar.id, socialCalendar);

  // Customer health check
  const healthCheck: WorkflowTemplate = {
    id: "workflow_health_check",
    name: "Günlük Platform Sağlık Kontrolü",
    description: "Her gün platform metriklerini analiz eder ve sorunları raporlar",
    trigger: {
      type: "schedule",
      config: { cron: "0 8 * * *" }, // Every day 8am
      description: "Her gün sabah 8'de",
    },
    steps: [
      { id: 1, agent: "monitor", action: "check_health", params: {}, onFailure: "stop" },
      { id: 2, agent: "analyst", action: "deep_analysis", params: {}, onFailure: "skip" },
      { id: 3, agent: "writer", action: "generate_summary", params: { type: "health_report" }, onFailure: "stop" },
      { id: 4, agent: "notifier", action: "send_notifications", params: { onlyIfIssues: true }, onFailure: "skip" },
    ],
    isActive: false,
    createdFrom: "ai_suggested",
    createdAt: Date.now(),
    runCount: 0,
  };
  workflows.set(healthCheck.id, healthCheck);

  // New customer welcome
  const welcomeFlow: WorkflowTemplate = {
    id: "workflow_welcome",
    name: "Yeni Müşteri Karşılama Akışı",
    description: "Yeni müşteri kaydında otomatik karşılama e-postası ve onboarding başlatır",
    trigger: {
      type: "db_event",
      config: { table: "customers", event: "insert" },
      description: "Yeni müşteri kaydı yapıldığında",
    },
    steps: [
      { id: 1, agent: "writer", action: "generate_content", params: { type: "email", template: "welcome" }, onFailure: "stop" },
      { id: 2, agent: "notifier", action: "send_notifications", params: { type: "welcome_email" }, onFailure: "retry" },
      { id: 3, agent: "operator", action: "execute_mutations", params: { action: "set_onboarding_status", status: "in_progress" }, onFailure: "stop" },
    ],
    isActive: false,
    createdFrom: "ai_suggested",
    createdAt: Date.now(),
    runCount: 0,
  };
  workflows.set(welcomeFlow.id, welcomeFlow);
}

// ─── Workflow Stats ─────────────────────────────────────────────────────────

export function getWorkflowStats(): {
  total: number;
  active: number;
  totalRuns: number;
  byTriggerType: Record<string, number>;
} {
  let active = 0, totalRuns = 0;
  const byTrigger: Record<string, number> = {};

  for (const wf of workflows.values()) {
    if (wf.isActive) active++;
    totalRuns += wf.runCount;
    byTrigger[wf.trigger.type] = (byTrigger[wf.trigger.type] ?? 0) + 1;
  }

  return { total: workflows.size, active, totalRuns, byTriggerType: byTrigger };
}
