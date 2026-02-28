// ─── Atlas Copilot — Task Decomposer ────────────────────────────────────────
// Manus AI-level capability: break complex requests into visible sub-tasks.
//
// When a user asks a complex question, the decomposer:
//   1. Identifies the complexity level
//   2. Breaks it into actionable sub-tasks
//   3. Assigns each sub-task to the appropriate pipeline step
//   4. Tracks completion status
//
// This gives Manus AI-style "thinking process" visibility.
// ─────────────────────────────────────────────────────────────────────────────
import type { IntentSignal, AgentRole } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubTask {
  id: number;
  title: string;           // Turkish title
  description: string;     // Turkish description
  type: "analyze" | "fetch" | "compute" | "generate" | "action" | "report";
  agent: AgentRole;
  status: "pending" | "running" | "done" | "skipped";
  durationMs?: number;
  result?: string;
}

export interface TaskPlan {
  complexity: "simple" | "moderate" | "complex" | "deep";
  totalSteps: number;
  tasks: SubTask[];
  reasoning: string;       // Why this plan
  estimatedMs: number;
}

// ─── Complexity Detection ───────────────────────────────────────────────────

interface ComplexitySignal {
  signal: string;
  weight: number;
}

const COMPLEXITY_INDICATORS: ComplexitySignal[] = [
  // Deep analysis indicators
  { signal: "analiz|analyze|analysis|derinlemesine", weight: 3 },
  { signal: "karşılaştır|compare|vs|versus|fark", weight: 3 },
  { signal: "tahmin|forecast|predict|öngörü", weight: 3 },
  { signal: "neden|sebep|why|cause|reason", weight: 2 },
  { signal: "trend|eğilim|değişim|growth", weight: 2 },
  { signal: "rapor|report|özet|summary", weight: 2 },

  // Multi-domain indicators
  { signal: "genel|overall|tüm|hepsi|bütün", weight: 2 },
  { signal: "ve|ayrıca|aynı.*zamanda|hem.*hem", weight: 1 },

  // Action indicators
  { signal: "güncelle|değiştir|yap|oluştur|ekle|sil", weight: 2 },

  // Specificity
  { signal: "detaylı|detailed|kapsamlı|comprehensive", weight: 2 },
  { signal: "son\\s*\\d+\\s*(gün|hafta|ay)", weight: 1 },
];

function detectComplexity(message: string, signals: IntentSignal[]): "simple" | "moderate" | "complex" | "deep" {
  const lower = message.toLowerCase();
  let score = 0;

  // Check text patterns
  for (const indicator of COMPLEXITY_INDICATORS) {
    if (new RegExp(indicator.signal, "i").test(lower)) {
      score += indicator.weight;
    }
  }

  // Multi-domain bonus
  const domainCount = signals.filter(s => s.confidence > 0.2).length;
  score += (domainCount - 1) * 2;

  // Message length bonus
  if (message.length > 100) score += 1;
  if (message.length > 200) score += 2;

  if (score >= 10) return "deep";
  if (score >= 6) return "complex";
  if (score >= 3) return "moderate";
  return "simple";
}

// ─── Task Generation ────────────────────────────────────────────────────────

export function decomposeTask(
  message: string,
  signals: IntentSignal[],
): TaskPlan {
  const complexity = detectComplexity(message, signals);
  const lower = message.toLowerCase();
  const tasks: SubTask[] = [];
  let taskId = 1;

  const primaryDomain = signals[0]?.domain ?? "strategy";
  const supportDomains = signals.slice(1).filter(s => s.confidence > 0.2).map(s => s.domain);

  // Common first task: intent understanding
  tasks.push({
    id: taskId++,
    title: "Mesaj Analizi",
    description: "Kullanıcı sorusu analiz ediliyor, niyet ve domain belirleniyor",
    type: "analyze",
    agent: "coordinator",
    status: "pending",
  });

  // Fetch tasks per domain
  tasks.push({
    id: taskId++,
    title: `${getDomainLabel(primaryDomain)} Verileri`,
    description: `${getDomainLabel(primaryDomain)} departmanından veriler çekiliyor`,
    type: "fetch",
    agent: primaryDomain,
    status: "pending",
  });

  for (const domain of supportDomains) {
    tasks.push({
      id: taskId++,
      title: `${getDomainLabel(domain)} Verileri`,
      description: `Ek veri: ${getDomainLabel(domain)} departmanı`,
      type: "fetch",
      agent: domain,
      status: "pending",
    });
  }

  // Deep analysis tasks for complex queries
  if (complexity === "complex" || complexity === "deep") {
    if (lower.match(/trend|eğilim|büyüme|growth|değişim/)) {
      tasks.push({
        id: taskId++,
        title: "Trend Analizi",
        description: "Aylık trendler hesaplanıyor, değişim oranları belirleniyor",
        type: "compute",
        agent: "strategy",
        status: "pending",
      });
    }

    if (lower.match(/anomali|sorun|problem|dikkat|uyarı|risk/)) {
      tasks.push({
        id: taskId++,
        title: "Anomali Taraması",
        description: "Olağandışı durumlar taranıyor (düşük stok, gecikmiş ödemeler, vb.)",
        type: "compute",
        agent: "strategy",
        status: "pending",
      });
    }

    tasks.push({
      id: taskId++,
      title: "Sağlık Skoru Hesaplama",
      description: "Sistem sağlık skoru hesaplanıyor (sipariş, destek, müşteri, envanter)",
      type: "compute",
      agent: "strategy",
      status: "pending",
    });
  }

  if (complexity === "deep") {
    tasks.push({
      id: taskId++,
      title: "Korelasyon Analizi",
      description: "Departmanlar arası ilişkiler ve öngörüler üretiliyor",
      type: "compute",
      agent: "strategy",
      status: "pending",
    });
  }

  // Action detection
  if (lower.match(/güncelle|değiştir|yap|kapat|tamamla|onayla/)) {
    tasks.push({
      id: taskId++,
      title: "Aksiyon Tespiti",
      description: "Yapılması istenen işlemler tespit ediliyor",
      type: "action",
      agent: primaryDomain,
      status: "pending",
    });
  }

  // Report generation
  if (lower.match(/rapor|report|özet|summary|analiz|tablo/)) {
    tasks.push({
      id: taskId++,
      title: "Rapor Oluşturma",
      description: "Detaylı rapor/doküman oluşturuluyor",
      type: "report",
      agent: "strategy",
      status: "pending",
    });
  }

  // Always: generate response
  tasks.push({
    id: taskId++,
    title: "Yanıt Üretimi",
    description: "Tüm veriler birleştirilerek uzman yanıt oluşturuluyor",
    type: "generate",
    agent: primaryDomain,
    status: "pending",
  });

  return {
    complexity,
    totalSteps: tasks.length,
    tasks,
    reasoning: generateReasoning(complexity, signals, tasks),
    estimatedMs: estimateTime(complexity, tasks.length),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDomainLabel(domain: AgentRole): string {
  const labels: Record<AgentRole, string> = {
    coordinator: "Koordinatör",
    customer: "Müşteri İlişkileri",
    commerce: "E-Ticaret",
    marketing: "Pazarlama",
    finance: "Finans",
    operations: "Operasyon",
    strategy: "Strateji",
  };
  return labels[domain] ?? domain;
}

function generateReasoning(
  complexity: string,
  signals: IntentSignal[],
  tasks: SubTask[],
): string {
  const domains = signals.slice(0, 3).map(s => getDomainLabel(s.domain)).join(", ");

  switch (complexity) {
    case "deep":
      return `Derin analiz gerekiyor. ${domains} departmanlarından veri çekilecek, trend analizi, anomali taraması ve öngörü üretilecek. ${tasks.length} adım planlandı.`;
    case "complex":
      return `Çok boyutlu soru. ${domains} alanlarında analiz yapılacak. ${tasks.length} adım planlandı.`;
    case "moderate":
      return `${domains} alanında veri analizi yapılacak. ${tasks.length} adım planlandı.`;
    default:
      return `${domains} alanında hızlı sorgu. ${tasks.length} adım.`;
  }
}

function estimateTime(complexity: string, stepCount: number): number {
  const baseMs: Record<string, number> = {
    simple: 2000,
    moderate: 4000,
    complex: 7000,
    deep: 12000,
  };
  return (baseMs[complexity] ?? 3000) + stepCount * 500;
}
