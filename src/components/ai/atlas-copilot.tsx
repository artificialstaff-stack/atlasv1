"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  RotateCcw,
  Users,
  ShoppingCart,
  Headphones,
  BarChart3,
  DollarSign,
  Settings,
  Megaphone,
  Brain,
  Activity,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap,
  FileText,
  Copy,
  Download,
  Target,
  AlertTriangle,
  Heart,
  Layers,
  Eye,
  ChevronDown,
  ChevronRight,
  Bot,
  Sparkles,
  Store,
  TrendingUp,
  Play,
  Pause,
  CheckCheck,
  XCircle,
  Bell,
  Workflow,
  Pen,
  Film,
  Image,
  Share2,
  Clock,
  Shield,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─── Mode Type ──────────────────────────────────────────────────────────────
type CopilotMode = "chat" | "autonomous";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: { role: string; label: string; icon: string };
  pipelineSteps?: PipelineStep[];
  taskPlan?: TaskPlanData;
  analysis?: AnalysisData;
  actions?: ActionData;
  artifacts?: ArtifactData[];
  memoryInfo?: MemoryData;
  meta?: Record<string, unknown>;
}

interface PipelineStep {
  step: string;
  message: string;
  progress: number;
  total: number;
  status: "running" | "done";
  durationMs?: number;
}

interface TaskPlanData {
  complexity: string;
  totalSteps: number;
  tasks: Array<{
    id: number;
    type: string;
    label: string;
    domain?: string;
    status: string;
  }>;
  reasoning: string;
  estimatedMs: number;
}

interface AnalysisData {
  health: {
    overall: number;
    dimensions: Array<{ name: string; score: number; status: string }>;
  };
  anomalyCount: number;
  trendCount: number;
  predictionCount: number;
  anomalies: Array<{ type: string; severity: string; message: string }>;
  predictions: Array<{
    type: string;
    confidence: number;
    description: string;
  }>;
}

interface ActionData {
  detected: Array<{
    type: string;
    description: string;
    confidence: number;
    requiresConfirmation: boolean;
  }>;
  autoExecute: number;
  needsConfirmation: number;
}

interface ArtifactData {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface MemoryData {
  entityCount: number;
  entities: string[];
  conversationCount: number;
  sessionSummary: string | null;
}

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

// ─── Autonomous-Specific Types ──────────────────────────────────────────────

interface AutonomousPlan {
  planId: string;
  goal: string;
  reasoning: string;
  complexity: string;
  phaseCount: number;
  totalTasks: number;
  autonomyLevel: string;
  phases: Array<{
    id: number;
    name: string;
    description: string;
    taskCount: number;
    gateType: string;
    status?: string;
    tasks: Array<{
      id: string;
      agent: string;
      agentName: string;
      action: string;
      description: string;
      status?: string;
      durationMs?: number;
    }>;
  }>;
}

interface ApprovalItem {
  approvalId: string;
  type: string;
  title: string;
  description: string;
  preview?: string;
  urgency: string;
  phaseId?: number;
  phaseName?: string;
  contents?: Record<string, unknown>[];
}

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  suggestedAction?: string;
  autoActionAvailable?: boolean;
  detectedAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ReactNode> = {
  customer: <Users className="h-4 w-4" />,
  commerce: <ShoppingCart className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  finance: <DollarSign className="h-4 w-4" />,
  operations: <Settings className="h-4 w-4" />,
  strategy: <BarChart3 className="h-4 w-4" />,
  coordinator: <Brain className="h-4 w-4" />,
};

const AGENT_COLORS: Record<string, string> = {
  customer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  commerce: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  marketing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  finance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  operations: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  strategy: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  coordinator: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const QUICK_PROMPTS = [
  {
    icon: <BarChart3 className="h-4 w-4" />,
    label: "Genel Durum Raporu",
    prompt: "Platformun genel durumunu analiz et, sağlık skoru ver ve kritik konulari listele",
    color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/20",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Trend Analizi",
    prompt: "Son dönem sipariş ve müşteri trendlerini analiz et, tahminler üret",
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/20",
  },
  {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Anomali Tarama",
    prompt: "Tüm departmanlarda anomali taraması yap, risk ve uyarıları listele",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/20",
  },
  {
    icon: <Users className="h-4 w-4" />,
    label: "Müşteri Durumu",
    prompt: "Kaç müşterimiz var, onboarding durumları nasıl, kritik müşteriler kimler?",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/20",
  },
  {
    icon: <ShoppingCart className="h-4 w-4" />,
    label: "Sipariş Analizi",
    prompt: "Bekleyen siparişleri listele, toplam geliri hesapla, karşılaştırmalı analiz yap",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/20",
  },
  {
    icon: <DollarSign className="h-4 w-4" />,
    label: "Finansal Rapor",
    prompt: "Gelir, gider, kâr marjı ve tahsilat durumunu raporla",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20",
  },
  {
    icon: <Headphones className="h-4 w-4" />,
    label: "Destek Durumu",
    prompt: "Açık destek talepleri, yüksek öncelikli ticket'lar ve çözüm oranları",
    color: "from-orange-500/20 to-red-500/20 border-orange-500/20",
  },
  {
    icon: <Store className="h-4 w-4" />,
    label: "Pazaryeri Performans",
    prompt: "Amazon ve eBay performansını karşılaştır, ROAS ve dönüşüm oranlarını analiz et",
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/20",
  },
];

const AUTONOMOUS_PROMPTS = [
  {
    icon: <Share2 className="h-4 w-4" />,
    label: "Sosyal Medya İçerik",
    prompt: "Tüm müşterilerimiz için sosyal medya içerikleri oluştur, her kanala uyarla ve onaya gönder",
    color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/20",
  },
  {
    icon: <Film className="h-4 w-4" />,
    label: "Video Senaryo",
    prompt: "Atlas platformunu tanıtan kısa video senaryosu yaz, storyboard oluştur ve görsel promptlar hazırla",
    color: "from-rose-500/20 to-red-500/20 border-rose-500/20",
  },
  {
    icon: <Gauge className="h-4 w-4" />,
    label: "Otonom Sağlık Kontrolü",
    prompt: "Platform sağlık kontrolü yap, anomalileri tespit et ve her sorun için aksiyon planı oluştur",
    color: "from-emerald-500/20 to-green-500/20 border-emerald-500/20",
  },
  {
    icon: <Pen className="h-4 w-4" />,
    label: "Blog & E-posta",
    prompt: "ABD pazarına giren girişimciler için blog yazısı ve e-posta kampanyası oluştur",
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/20",
  },
  {
    icon: <Workflow className="h-4 w-4" />,
    label: "İş Akışı Oluştur",
    prompt: "Her hafta pazartesi sabah otomatik sosyal medya içerik planı oluşturan iş akışı kur",
    color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/20",
  },
  {
    icon: <Bell className="h-4 w-4" />,
    label: "Proaktif Analiz",
    prompt: "Tüm metrikleri incele, riskleri ve fırsatları tespit et, otomatik aksiyonları öner",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/20",
  },
];

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs font-mono"
        >
          <code className="text-emerald-300">{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className="mt-3 mb-1.5 text-sm font-bold text-white/90"
        >
          {processInline(line.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h2-${i}`}
          className="mt-4 mb-2 text-base font-bold text-white"
        >
          {processInline(line.slice(3))}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h1-${i}`} className="mt-4 mb-2 text-lg font-bold text-white">
          {processInline(line.slice(2))}
        </h2>,
      );
      i++;
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].includes("|") &&
        lines[i].trim().startsWith("|")
      ) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !l.match(/^\|[\s-:|]+\|$/))
        .map((l) =>
          l
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim()),
        );
      if (rows.length > 0) {
        elements.push(
          <div
            key={`table-${i}`}
            className="my-3 overflow-x-auto rounded-lg border border-white/10"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {rows[0].map((cell, ci) => (
                    <th
                      key={ci}
                      className="px-3 py-2 text-left text-xs font-semibold text-white/80"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-white/5 last:border-0"
                  >
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-xs text-white/60">
                        {processInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (line.match(/^---+$/)) {
      elements.push(
        <hr key={`hr-${i}`} className="my-3 border-white/10" />,
      );
      i++;
      continue;
    }

    if (line.match(/^\s*[-*]\s/)) {
      const bullets: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        bullets.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 ml-4 space-y-1">
          {bullets.map((b, bi) => (
            <li
              key={bi}
              className="flex items-start gap-2 text-sm text-white/70"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
              <span>{processInline(b)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.match(/^\s*\d+[.)]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+[.)]\s/)) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 ml-4 space-y-1">
          {items.map((item, ii) => (
            <li
              key={ii}
              className="flex items-start gap-2 text-sm text-white/70"
            >
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-cyan-400/80">
                {ii + 1}.
              </span>
              <span>{processInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-white/70">
        {processInline(line)}
      </p>,
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(
        <strong key={key++} className="font-semibold text-white/90">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) parts.push(remaining.slice(0, codeMatch.index));
      parts.push(
        <code
          key={key++}
          className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-emerald-300"
        >
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0)
        parts.push(remaining.slice(0, italicMatch.index));
      parts.push(
        <em key={key++} className="italic text-white/60">
          {italicMatch[1]}
        </em>,
      );
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function PipelineStepsView({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2.5 text-xs">
          {step.status === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400" />
          )}
          <span
            className={cn(
              "flex-1",
              step.status === "done" ? "text-white/40" : "text-white/70",
            )}
          >
            {step.message}
          </span>
          {step.durationMs !== undefined && (
            <span className="shrink-0 text-white/20 text-[10px]">
              {step.durationMs}ms
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskStepsView({ taskPlan }: { taskPlan: TaskPlanData }) {
  const [collapsed, setCollapsed] = useState(false);
  const complexityColors: Record<string, string> = {
    simple: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    moderate: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    complex: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    deep: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  const complexityLabels: Record<string, string> = {
    simple: "Basit",
    moderate: "Orta",
    complex: "Karmaşık",
    deep: "Derin Analiz",
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.02] transition-colors"
      >
        <Target className="h-4 w-4 text-cyan-400" />
        <span className="text-white/60 font-medium">Görev Planı</span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
            complexityColors[taskPlan.complexity] ?? "text-white/40",
          )}
        >
          {complexityLabels[taskPlan.complexity] ?? taskPlan.complexity}
        </span>
        <span className="flex-1" />
        <span className="text-white/30 text-[10px]">
          {taskPlan.tasks.filter((t) => t.status === "done").length}/
          {taskPlan.totalSteps}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-white/30 transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>
      {!collapsed && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1.5">
          {taskPlan.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-xs">
              {task.status === "done" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : task.status === "running" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-white/20" />
              )}
              <span
                className={cn(
                  "flex-1",
                  task.status === "done"
                    ? "text-white/35 line-through"
                    : task.status === "running"
                      ? "text-white/80"
                      : "text-white/50",
                )}
              >
                {task.label}
              </span>
              {task.domain && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] border",
                    AGENT_COLORS[task.domain] ?? "text-white/30",
                  )}
                >
                  {task.domain}
                </span>
              )}
            </div>
          ))}
          {taskPlan.reasoning && (
            <p className="mt-1 text-[10px] text-white/20 italic">
              {taskPlan.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HealthScoreBadge({ analysis }: { analysis: AnalysisData }) {
  const score = analysis.health.overall;
  const getColor = (s: number) => {
    if (s >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (s >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };
  const getLabel = (s: number) => {
    if (s >= 80) return "Sağlıklı";
    if (s >= 60) return "Dikkat";
    return "Kritik";
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-medium text-white/60">
          Platform Sağlığı
        </span>
        <span
          className={cn(
            "ml-auto rounded-full border px-2.5 py-0.5 text-xs font-bold",
            getColor(score),
          )}
        >
          {score}/100 — {getLabel(score)}
        </span>
      </div>
      <div className="space-y-1.5">
        {analysis.health.dimensions.map((dim, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40">{dim.name}</span>
              <span
                className={cn(
                  dim.score >= 80
                    ? "text-emerald-400"
                    : dim.score >= 60
                      ? "text-amber-400"
                      : "text-red-400",
                )}
              >
                {dim.score}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  dim.score >= 80
                    ? "bg-emerald-500"
                    : dim.score >= 60
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {analysis.anomalyCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-500/5 border border-amber-500/10 px-2 py-1 text-[10px] text-amber-400/80">
          <AlertTriangle className="h-3 w-3" />
          <span>
            {analysis.anomalyCount} anomali tespit edildi
          </span>
        </div>
      )}
    </div>
  );
}

function ActionCard({ actions }: { actions: ActionData }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <Zap className="h-4 w-4 text-amber-400" />
        <span className="font-medium text-amber-300">
          Aksiyonlar Tespit Edildi
        </span>
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
          {actions.detected.length}
        </span>
      </div>
      {actions.detected.map((action, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          {action.requiresConfirmation ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          )}
          <div className="flex-1">
            <span className="text-white/60">{action.description}</span>
            {action.requiresConfirmation && (
              <span className="ml-1 text-[10px] text-amber-400/60">
                (onay gerekli)
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/20">
            {Math.round(action.confidence * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactData }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    report: <FileText className="h-4 w-4" />,
    summary: <BarChart3 className="h-4 w-4" />,
    table: <Layers className="h-4 w-4" />,
    checklist: <CheckCircle2 className="h-4 w-4" />,
    analysis: <TrendingUp className="h-4 w-4" />,
  };

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
          {typeIcons[artifact.type] ?? <FileText className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-cyan-300 truncate">
            {artifact.title}
          </p>
          <p className="text-[10px] text-white/30">
            {artifact.type} •{" "}
            {Math.round(artifact.content.length / 1024)}KB
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/30 hover:text-white/60"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/30 hover:text-white/60"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/30 hover:text-white/60"
            onClick={() => setExpanded(!expanded)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-cyan-500/10 px-3 py-2 max-h-[300px] overflow-y-auto">
          <pre className="text-xs text-white/50 whitespace-pre-wrap font-mono leading-relaxed">
            {artifact.content}
          </pre>
        </div>
      )}
    </div>
  );
}

function MemoryIndicator({ memory }: { memory: MemoryData }) {
  if (memory.entityCount === 0 && memory.conversationCount === 0) return null;
  return (
    <div className="flex items-center gap-2 text-[10px] text-purple-400/60">
      <Brain className="h-3.5 w-3.5" />
      {memory.entityCount > 0 && <span>{memory.entityCount} varlık</span>}
      {memory.conversationCount > 0 && (
        <>
          <span>•</span>
          <span>{memory.conversationCount} hafıza</span>
        </>
      )}
      {memory.entities.length > 0 && (
        <>
          <span>•</span>
          <span className="truncate max-w-[200px]">
            {memory.entities.join(", ")}
          </span>
        </>
      )}
    </div>
  );
}

function AgentBadge({ agent }: { agent: { role: string; label: string } }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        AGENT_COLORS[agent.role] ?? "bg-white/5 text-white/60 border-white/10",
      )}
    >
      {AGENT_ICONS[agent.role] ?? <Bot className="h-3.5 w-3.5" />}
      <span>{agent.label}</span>
    </div>
  );
}

// ─── Autonomous Sub-Components ──────────────────────────────────────────────

const SUB_AGENT_COLORS: Record<string, string> = {
  planner: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  researcher: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  writer: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  designer: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  video_producer: "text-red-400 bg-red-500/10 border-red-500/20",
  social_manager: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
  analyst: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  operator: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  notifier: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  quality_checker: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  scheduler: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  monitor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

function AutonomousPlanView({ plan }: { plan: AutonomousPlan }) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const completedTasks = plan.phases.reduce(
    (s, p) => s + p.tasks.filter(t => t.status === "completed").length, 0,
  );
  const failedTasks = plan.phases.reduce(
    (s, p) => s + p.tasks.filter(t => t.status === "failed").length, 0,
  );

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-cyan-500/10">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Otonom Yürütme Planı</span>
          <span className="ml-auto text-[10px] text-white/30">
            {completedTasks}/{plan.totalTasks} görev
            {failedTasks > 0 && <span className="text-red-400 ml-1">({failedTasks} hata)</span>}
          </span>
        </div>
        <p className="text-[10px] text-white/40">{plan.reasoning}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
            plan.complexity === "epic" ? "text-purple-400 border-purple-500/20 bg-purple-500/10" :
            plan.complexity === "complex" ? "text-amber-400 border-amber-500/20 bg-amber-500/10" :
            "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
          )}>
            {plan.complexity}
          </span>
          <span className={cn(
            "rounded-full border px-2 py-0.5 text-[10px]",
            plan.autonomyLevel === "full" ? "text-emerald-400 border-emerald-500/20" :
            plan.autonomyLevel === "approval_required" ? "text-amber-400 border-amber-500/20" :
            "text-blue-400 border-blue-500/20",
          )}>
            {plan.autonomyLevel === "full" ? "Tam Otonom" :
             plan.autonomyLevel === "approval_required" ? "Onay Gerekli" : "Denetimli"}
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {plan.phases.map((phase) => {
          const isExpanded = expandedPhase === phase.id;
          const phaseCompleted = phase.tasks.every(t => t.status === "completed");
          const phaseFailed = phase.tasks.some(t => t.status === "failed");
          const phaseRunning = phase.tasks.some(t => t.status === "running");

          return (
            <div key={phase.id}>
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.02] transition-colors"
              >
                {phaseCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : phaseFailed ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                ) : phaseRunning ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-white/20" />
                )}
                <span className={cn(
                  "flex-1 text-left font-medium",
                  phaseCompleted ? "text-white/40" : "text-white/70",
                )}>
                  {phase.name}
                </span>
                {phase.gateType === "approval" && (
                  <Shield className="h-3 w-3 text-amber-400/60" />
                )}
                <span className="text-[10px] text-white/25">
                  {phase.tasks.filter(t => t.status === "completed").length}/{phase.taskCount}
                </span>
                <ChevronRight className={cn(
                  "h-3 w-3 text-white/20 transition-transform",
                  isExpanded && "rotate-90",
                )} />
              </button>
              {isExpanded && (
                <div className="border-t border-white/5 bg-white/[0.01] px-3 py-2 space-y-1">
                  {phase.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-[11px]">
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                      ) : task.status === "running" ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-400" />
                      ) : task.status === "failed" ? (
                        <XCircle className="h-3 w-3 shrink-0 text-red-400" />
                      ) : (
                        <Circle className="h-3 w-3 shrink-0 text-white/15" />
                      )}
                      <span className={cn(
                        "flex-1",
                        task.status === "completed" ? "text-white/35" :
                        task.status === "failed" ? "text-red-300/60" :
                        task.status === "running" ? "text-white/70" : "text-white/40",
                      )}>
                        {task.description}
                      </span>
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] border shrink-0",
                        SUB_AGENT_COLORS[task.agent] ?? "text-white/30",
                      )}>
                        {task.agentName}
                      </span>
                      {task.durationMs && (
                        <span className="text-[9px] text-white/15 shrink-0">{task.durationMs}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, onAction }: { approval: ApprovalItem; onAction: (id: string, decision: "approved" | "rejected") => void }) {
  const urgencyColors = {
    critical: "border-red-500/30 bg-red-500/5",
    high: "border-amber-500/30 bg-amber-500/5",
    normal: "border-blue-500/30 bg-blue-500/5",
    low: "border-white/10 bg-white/[0.02]",
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      urgencyColors[approval.urgency as keyof typeof urgencyColors] ?? urgencyColors.normal,
    )}>
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/80 truncate">{approval.title}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{approval.description}</p>
        </div>
      </div>
      {approval.preview && (
        <pre className="text-[10px] text-white/30 bg-black/20 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
          {approval.preview}
        </pre>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onAction(approval.approvalId, "approved")}
          className="h-7 flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
          size="sm"
        >
          <CheckCheck className="h-3 w-3 mr-1" /> Onayla
        </Button>
        <Button
          onClick={() => onAction(approval.approvalId, "rejected")}
          className="h-7 flex-1 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-bold"
          size="sm"
          variant="destructive"
        >
          <XCircle className="h-3 w-3 mr-1" /> Reddet
        </Button>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const severityColors = {
    critical: "border-red-500/30 bg-red-500/5 text-red-300",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
  };
  const severityIcons = {
    critical: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    info: <Bell className="h-3.5 w-3.5 text-blue-400" />,
  };

  return (
    <div className={cn(
      "rounded-lg border p-2.5 space-y-1",
      severityColors[alert.severity as keyof typeof severityColors] ?? severityColors.info,
    )}>
      <div className="flex items-start gap-2">
        {severityIcons[alert.severity as keyof typeof severityIcons] ?? severityIcons.info}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium truncate">{alert.title}</p>
          <p className="text-[10px] opacity-60 mt-0.5">{alert.message}</p>
        </div>
      </div>
      {alert.suggestedAction && (
        <p className="text-[10px] text-cyan-400/60 pl-5">
          Öneri: {alert.suggestedAction}
        </p>
      )}
    </div>
  );
}

// ─── Main Copilot Component ─────────────────────────────────────────────────

export function AtlasCopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [activeAgent, setActiveAgent] = useState<{
    role: string;
    label: string;
  } | null>(null);

  // Manus-level live state
  const [liveTaskPlan, setLiveTaskPlan] = useState<TaskPlanData | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<AnalysisData | null>(null);
  const [liveActions, setLiveActions] = useState<ActionData | null>(null);
  const [liveArtifacts, setLiveArtifacts] = useState<ArtifactData[]>([]);
  const [liveMemory, setLiveMemory] = useState<MemoryData | null>(null);

  // ── Autonomous Mode State ─────────────────────────────────────────────────
  const [mode, setMode] = useState<CopilotMode>("chat");
  const [livePlan, setLivePlan] = useState<AutonomousPlan | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rightTab, setRightTab] = useState<"analysis" | "approvals" | "alerts">("analysis");

  // Session ID — generated client-side only to avoid hydration mismatch
  const sessionIdRef = useRef<string>("");
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pipelineSteps, liveTaskPlan, liveAnalysis]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Send Message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput("");
      setError(null);
      setPipelineSteps([]);
      setActiveAgent(null);
      setLiveTaskPlan(null);
      setLiveAnalysis(null);
      setLiveActions(null);
      setLiveArtifacts([]);
      setLiveMemory(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            sessionId: sessionIdRef.current,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `HTTP ${res.status}`);
        }
        if (!res.body) throw new Error("Yanıt gövdesi yok");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = crypto.randomUUID();
        let agentInfo: {
          role: string;
          label: string;
          icon: string;
        } | null = null;
        const steps: PipelineStep[] = [];
        let assistantMessageAdded = false;
        let currentTaskPlan: TaskPlanData | null = null;
        let currentAnalysis: AnalysisData | null = null;
        let currentActions: ActionData | null = null;
        const currentArtifacts: ArtifactData[] = [];
        let currentMemory: MemoryData | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const block of lines) {
            const dataLine = block.trim();
            if (!dataLine.startsWith("data: ")) continue;

            try {
              const event: SSEEvent = JSON.parse(dataLine.slice(6));

              switch (event.type) {
                case "status": {
                  const step: PipelineStep = {
                    step: event.data.step as string,
                    message: event.data.message as string,
                    progress: event.data.progress as number,
                    total: event.data.total as number,
                    status: "running",
                  };
                  if (steps.length > 0) {
                    steps[steps.length - 1].status = "done";
                  }
                  steps.push(step);
                  setPipelineSteps([...steps]);
                  break;
                }

                case "tasks": {
                  currentTaskPlan = {
                    complexity: event.data.complexity as string,
                    totalSteps: event.data.totalSteps as number,
                    tasks: (
                      event.data.tasks as TaskPlanData["tasks"]
                    ).map((t) => ({ ...t, status: "pending" })),
                    reasoning: event.data.reasoning as string,
                    estimatedMs: event.data.estimatedMs as number,
                  };
                  setLiveTaskPlan({ ...currentTaskPlan });
                  break;
                }

                case "task_update": {
                  if (currentTaskPlan) {
                    const taskId = event.data.taskId as number;
                    const status = event.data.status as string;
                    currentTaskPlan.tasks = currentTaskPlan.tasks.map(
                      (t) => (t.id === taskId ? { ...t, status } : t),
                    );
                    setLiveTaskPlan({ ...currentTaskPlan });
                  }
                  break;
                }

                case "memory": {
                  currentMemory = {
                    entityCount: event.data.entityCount as number,
                    entities: event.data.entities as string[],
                    conversationCount:
                      event.data.conversationCount as number,
                    sessionSummary:
                      (event.data.sessionSummary as string) ?? null,
                  };
                  setLiveMemory({ ...currentMemory });
                  break;
                }

                case "analysis": {
                  currentAnalysis = {
                    health:
                      event.data.health as AnalysisData["health"],
                    anomalyCount: event.data.anomalyCount as number,
                    trendCount: event.data.trendCount as number,
                    predictionCount:
                      event.data.predictionCount as number,
                    anomalies:
                      (event.data
                        .anomalies as AnalysisData["anomalies"]) ??
                      [],
                    predictions:
                      (event.data
                        .predictions as AnalysisData["predictions"]) ??
                      [],
                  };
                  setLiveAnalysis({ ...currentAnalysis });
                  break;
                }

                case "action": {
                  currentActions = {
                    detected:
                      event.data.detected as ActionData["detected"],
                    autoExecute: event.data.autoExecute as number,
                    needsConfirmation:
                      event.data.needsConfirmation as number,
                  };
                  setLiveActions({ ...currentActions });
                  break;
                }

                case "artifact": {
                  const artifact: ArtifactData = {
                    id: event.data.id as string,
                    type: event.data.type as string,
                    title: event.data.title as string,
                    content: event.data.content as string,
                    metadata: event.data.metadata as
                      | Record<string, unknown>
                      | undefined,
                  };
                  currentArtifacts.push(artifact);
                  setLiveArtifacts([...currentArtifacts]);
                  break;
                }

                case "intent":
                case "plan":
                case "context":
                  break;

                case "agent": {
                  agentInfo = {
                    role: event.data.role as string,
                    label: event.data.label as string,
                    icon: event.data.icon as string,
                  };
                  setActiveAgent({
                    role: agentInfo.role,
                    label: agentInfo.label,
                  });
                  break;
                }

                case "text": {
                  const chunk = event.data.content as string;
                  assistantContent += chunk;

                  if (!assistantMessageAdded) {
                    steps.forEach((s) => {
                      s.status = "done";
                    });
                    setPipelineSteps([...steps]);

                    setMessages((prev) => [
                      ...prev,
                      {
                        id: assistantId,
                        role: "assistant",
                        content: assistantContent,
                        timestamp: new Date(),
                        agent: agentInfo ?? undefined,
                        pipelineSteps: [...steps],
                        taskPlan: currentTaskPlan ?? undefined,
                        analysis: currentAnalysis ?? undefined,
                        actions: currentActions ?? undefined,
                        artifacts:
                          currentArtifacts.length > 0
                            ? [...currentArtifacts]
                            : undefined,
                        memoryInfo: currentMemory ?? undefined,
                      },
                    ]);
                    assistantMessageAdded = true;
                  } else {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: assistantContent }
                          : m,
                      ),
                    );
                  }
                  break;
                }

                case "done": {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            meta: event.data as Record<
                              string,
                              unknown
                            >,
                            taskPlan:
                              currentTaskPlan ?? m.taskPlan,
                            analysis:
                              currentAnalysis ?? m.analysis,
                            actions:
                              currentActions ?? m.actions,
                            artifacts:
                              currentArtifacts.length > 0
                                ? [...currentArtifacts]
                                : m.artifacts,
                            memoryInfo:
                              currentMemory ?? m.memoryInfo,
                          }
                        : m,
                    ),
                  );
                  break;
                }

                case "error": {
                  throw new Error(event.data.message as string);
                }
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== "PIPELINE_ERROR"
              ) {
                if (dataLine.includes('"type":"error"'))
                  throw parseErr;
              }
            }
          }
        }

        if (!assistantContent.trim() && assistantMessageAdded) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "Yanıt oluşturulamadı. Lütfen farklı bir soru deneyin.",
                  }
                : m,
            ),
          );
        } else if (!assistantMessageAdded) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content:
                "Yanıt alınamadı. Ollama servisinin çalıştığından emin olun.",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      } finally {
        setIsLoading(false);
        setPipelineSteps([]);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages],
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPipelineSteps([]);
    setActiveAgent(null);
    setIsLoading(false);
    setLiveTaskPlan(null);
    setLiveAnalysis(null);
    setLiveActions(null);
    setLiveArtifacts([]);
    setLiveMemory(null);
    setLivePlan(null);
  }, []);

  // ── Autonomous Command Sender ─────────────────────────────────────────────

  const sendAutonomousCommand = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput("");
      setError(null);
      setLivePlan(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: `🤖 [OTONOM] ${content}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/autonomous", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: content,
            sessionId: sessionIdRef.current,
            priority: "normal",
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `HTTP ${res.status}`);
        }
        if (!res.body) throw new Error("Yanıt gövdesi yok");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = crypto.randomUUID();
        let assistantMessageAdded = false;
        let currentPlan: AutonomousPlan | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const block of lines) {
            const dataLine = block.trim();
            if (!dataLine.startsWith("data: ")) continue;

            try {
              const event: SSEEvent = JSON.parse(dataLine.slice(6));

              switch (event.type) {
                case "plan_created": {
                  currentPlan = {
                    planId: event.data.planId as string,
                    goal: event.data.goal as string,
                    reasoning: event.data.reasoning as string,
                    complexity: event.data.complexity as string,
                    phaseCount: event.data.phaseCount as number,
                    totalTasks: event.data.totalTasks as number,
                    autonomyLevel: event.data.autonomyLevel as string,
                    phases: (event.data.phases as AutonomousPlan["phases"]) ?? [],
                  };
                  setLivePlan({ ...currentPlan });
                  break;
                }
                case "phase_start": {
                  if (currentPlan) {
                    const phaseId = event.data.phaseId as number;
                    currentPlan.phases = currentPlan.phases.map(p =>
                      p.id === phaseId ? { ...p, status: "running" } : p,
                    );
                    setLivePlan({ ...currentPlan });
                  }
                  break;
                }
                case "phase_complete": {
                  if (currentPlan) {
                    const phaseId = event.data.phaseId as number;
                    const status = event.data.status as string;
                    currentPlan.phases = currentPlan.phases.map(p =>
                      p.id === phaseId ? { ...p, status } : p,
                    );
                    setLivePlan({ ...currentPlan });
                  }
                  break;
                }
                case "task_start": {
                  if (currentPlan) {
                    const taskId = event.data.taskId as string;
                    const phaseId = event.data.phaseId as number;
                    currentPlan.phases = currentPlan.phases.map(p =>
                      p.id === phaseId ? {
                        ...p,
                        tasks: p.tasks.map(t =>
                          t.id === taskId ? { ...t, status: "running" } : t,
                        ),
                      } : p,
                    );
                    setLivePlan({ ...currentPlan });
                  }
                  break;
                }
                case "task_complete": {
                  if (currentPlan) {
                    const taskId = event.data.taskId as string;
                    const durationMs = event.data.durationMs as number | undefined;
                    currentPlan.phases = currentPlan.phases.map(p => ({
                      ...p,
                      tasks: p.tasks.map(t =>
                        t.id === taskId ? { ...t, status: "completed", durationMs } : t,
                      ),
                    }));
                    setLivePlan({ ...currentPlan });
                  }
                  break;
                }
                case "task_failed": {
                  if (currentPlan) {
                    const taskId = event.data.taskId as string;
                    currentPlan.phases = currentPlan.phases.map(p => ({
                      ...p,
                      tasks: p.tasks.map(t =>
                        t.id === taskId ? { ...t, status: "failed" } : t,
                      ),
                    }));
                    setLivePlan({ ...currentPlan });
                  }
                  break;
                }
                case "approval_needed": {
                  const approval: ApprovalItem = {
                    approvalId: event.data.approvalId as string,
                    type: event.data.type as string,
                    title: event.data.title as string,
                    description: event.data.description as string,
                    preview: event.data.preview as string | undefined,
                    urgency: event.data.urgency as string,
                    phaseId: event.data.phaseId as number | undefined,
                    phaseName: event.data.phaseName as string | undefined,
                    contents: event.data.contents as Record<string, unknown>[] | undefined,
                  };
                  setApprovals(prev => [...prev, approval]);
                  setRightTab("approvals");
                  break;
                }
                case "agent_thinking":
                case "agent_delegating": {
                  const message = event.data.message as string;
                  setPipelineSteps(prev => {
                    const updated = prev.map(s => ({ ...s, status: "done" as const }));
                    return [...updated, {
                      step: event.type,
                      message,
                      progress: updated.length + 1,
                      total: 10,
                      status: "running" as const,
                    }];
                  });
                  break;
                }
                case "content_generated": {
                  // Could show content preview
                  break;
                }
                case "text": {
                  const chunk = event.data.content as string;
                  assistantContent += chunk;

                  if (!assistantMessageAdded) {
                    setMessages(prev => [
                      ...prev,
                      {
                        id: assistantId,
                        role: "assistant",
                        content: assistantContent,
                        timestamp: new Date(),
                      },
                    ]);
                    assistantMessageAdded = true;
                  } else {
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === assistantId ? { ...m, content: assistantContent } : m,
                      ),
                    );
                  }
                  break;
                }
                case "done": {
                  if (!assistantMessageAdded && assistantContent) {
                    setMessages(prev => [
                      ...prev,
                      {
                        id: assistantId,
                        role: "assistant",
                        content: assistantContent,
                        timestamp: new Date(),
                        meta: event.data as Record<string, unknown>,
                      },
                    ]);
                  } else if (assistantMessageAdded) {
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === assistantId ? { ...m, meta: event.data as Record<string, unknown> } : m,
                      ),
                    );
                  }
                  break;
                }
                case "error": {
                  throw new Error(event.data.message as string);
                }
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "AUTONOMOUS_PIPELINE_ERROR") {
                if (dataLine.includes('"type":"error"')) throw parseErr;
              }
            }
          }
        }

        if (!assistantMessageAdded) {
          setMessages(prev => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: assistantContent || "Otonom pipeline tamamlandı. Sonuçlar yukarıda gösterildi.",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      } finally {
        setIsLoading(false);
        setPipelineSteps([]);
        abortRef.current = null;
      }
    },
    [input, isLoading],
  );

  // ── Approval Handler ──────────────────────────────────────────────────────

  const handleApproval = useCallback(async (approvalId: string, decision: "approved" | "rejected") => {
    try {
      await fetch("/api/ai/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision }),
      });
      setApprovals(prev => prev.filter(a => a.approvalId !== approvalId));
    } catch {
      // ignore
    }
  }, []);

  // ── Smart Send (routes to correct handler based on mode) ──────────────────

  const smartSend = useCallback((text?: string) => {
    if (mode === "autonomous") {
      sendAutonomousCommand(text);
    } else {
      sendMessage(text);
    }
  }, [mode, sendAutonomousCommand, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        smartSend();
      }
    },
    [smartSend],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0e1a]">
      {/* ── Left Panel: Conversation ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#0d1220]/80 px-6 py-3 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white">Atlas Copilot</h1>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
                v5
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium border",
                mode === "autonomous"
                  ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              )}>
                {mode === "autonomous" ? "Otonom" : "Agentic"}
              </span>
            </div>
            <p className="text-[10px] text-white/30 truncate">
              {mode === "autonomous"
                ? "12 otonom ajan • planlama • onay • içerik • sosyal medya"
                : activeAgent
                  ? `${activeAgent.label} departmanı aktif`
                  : "6 uzman ajan • hafıza • analiz • aksiyon • rapor üretimi"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-white/10 overflow-hidden mr-2">
              <button
                onClick={() => setMode("chat")}
                className={cn(
                  "px-2.5 py-1.5 text-[10px] font-medium transition-colors",
                  mode === "chat"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-white/30 hover:text-white/50",
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setMode("autonomous")}
                className={cn(
                  "px-2.5 py-1.5 text-[10px] font-medium transition-colors",
                  mode === "autonomous"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-white/30 hover:text-white/50",
                )}
              >
                Otonom
              </button>
            </div>
            {approvals.length > 0 && (
              <span className="relative flex h-5 w-5 items-center justify-center mr-1">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center">
                  {approvals.length}
                </span>
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/30 hover:text-white/60 hover:bg-white/5"
              onClick={clearChat}
              title="Sıfırla"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          <div className="px-6 py-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Welcome */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <Sparkles className="h-10 w-10 text-cyan-400" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    Atlas AI Copilot
                  </h2>
                  <p className="text-sm text-white/40 max-w-md leading-relaxed">
                    {mode === "autonomous"
                      ? "Tam otonom yapay zeka sistemi. Tek komutla planlar, alt ajanlara dağıtır, içerik üretir, onay bekler ve yürütür."
                      : "Agentic yapay zeka asistanınız. Tüm departmanlardan veri çeker, trend analizi yapar, anomali tespit eder, aksiyon yürütür ve raporlar üretir."}
                  </p>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {(mode === "autonomous" ? [
                    {
                      icon: <Brain className="h-3 w-3" />,
                      label: "Otonom Planlama",
                      color: "text-fuchsia-400 border-fuchsia-500/20",
                    },
                    {
                      icon: <Users className="h-3 w-3" />,
                      label: "12 Alt Ajan",
                      color: "text-cyan-400 border-cyan-500/20",
                    },
                    {
                      icon: <Shield className="h-3 w-3" />,
                      label: "Onay Sistemi",
                      color: "text-amber-400 border-amber-500/20",
                    },
                    {
                      icon: <Share2 className="h-3 w-3" />,
                      label: "Sosyal Medya",
                      color: "text-purple-400 border-purple-500/20",
                    },
                    {
                      icon: <Film className="h-3 w-3" />,
                      label: "Video Senaryo",
                      color: "text-rose-400 border-rose-500/20",
                    },
                    {
                      icon: <Workflow className="h-3 w-3" />,
                      label: "İş Akışları",
                      color: "text-indigo-400 border-indigo-500/20",
                    },
                    {
                      icon: <Bell className="h-3 w-3" />,
                      label: "Proaktif",
                      color: "text-emerald-400 border-emerald-500/20",
                    },
                  ] : [
                    {
                      icon: <Brain className="h-3 w-3" />,
                      label: "Hafıza",
                      color: "text-purple-400 border-purple-500/20",
                    },
                    {
                      icon: <Target className="h-3 w-3" />,
                      label: "Görev Planlama",
                      color: "text-cyan-400 border-cyan-500/20",
                    },
                    {
                      icon: <Heart className="h-3 w-3" />,
                      label: "Sağlık Skoru",
                      color: "text-emerald-400 border-emerald-500/20",
                    },
                    {
                      icon: <Zap className="h-3 w-3" />,
                      label: "Aksiyon",
                      color: "text-amber-400 border-amber-500/20",
                    },
                    {
                      icon: <FileText className="h-3 w-3" />,
                      label: "Rapor Üretimi",
                      color: "text-blue-400 border-blue-500/20",
                    },
                    {
                      icon: <AlertTriangle className="h-3 w-3" />,
                      label: "Anomali",
                      color: "text-red-400 border-red-500/20",
                    },
                  ]).map((cap) => (
                    <span
                      key={cap.label}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium",
                        cap.color,
                      )}
                    >
                      {cap.icon}
                      {cap.label}
                    </span>
                  ))}
                </div>

                {/* Quick prompts */}
                <div className="w-full max-w-2xl grid grid-cols-2 gap-2 pt-2">
                  {(mode === "autonomous" ? AUTONOMOUS_PROMPTS : QUICK_PROMPTS).map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => smartSend(qp.prompt)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border bg-gradient-to-br p-3 text-left transition-all hover:scale-[1.01] hover:shadow-lg",
                        qp.color,
                      )}
                    >
                      <div className="mt-0.5 text-white/60">{qp.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-white/80">
                          {qp.label}
                        </p>
                        <p className="text-[10px] text-white/30 line-clamp-2 mt-0.5">
                          {qp.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-gradient-to-r from-cyan-600/80 to-blue-600/80 px-4 py-3">
                      <p className="text-sm leading-relaxed text-white">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] space-y-2.5">
                      {/* Agent badge */}
                      {msg.agent && (
                        <AgentBadge agent={msg.agent} />
                      )}

                      {/* Memory */}
                      {msg.memoryInfo && (
                        <MemoryIndicator memory={msg.memoryInfo} />
                      )}

                      {/* Task plan */}
                      {msg.taskPlan && (
                        <TaskStepsView taskPlan={msg.taskPlan} />
                      )}

                      {/* Pipeline steps */}
                      {msg.pipelineSteps &&
                        msg.pipelineSteps.length > 0 && (
                          <PipelineStepsView steps={msg.pipelineSteps} />
                        )}

                      {/* Health score */}
                      {msg.analysis && (
                        <HealthScoreBadge analysis={msg.analysis} />
                      )}

                      {/* Actions */}
                      {msg.actions &&
                        msg.actions.detected.length > 0 && (
                          <ActionCard actions={msg.actions} />
                        )}

                      {/* Main content */}
                      <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                        <RenderMarkdown content={msg.content} />
                      </div>

                      {/* Artifacts */}
                      {msg.artifacts &&
                        msg.artifacts.length > 0 && (
                          <div className="space-y-2">
                            {msg.artifacts.map((art) => (
                              <ArtifactCard
                                key={art.id}
                                artifact={art}
                              />
                            ))}
                          </div>
                        )}

                      {/* Meta */}
                      {msg.meta && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/20 px-1">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {String(msg.meta.pipelineMs)}ms
                          </span>
                          <span>
                            {String(msg.meta.totalRecords)} kayıt
                          </span>
                          <span>
                            {String(msg.meta.agentLabel)}
                          </span>
                          {msg.meta.complexity != null && (
                            <span>{String(msg.meta.complexity)}</span>
                          )}
                          {Number(msg.meta.actionsDetected) > 0 && (
                            <span>
                              {Number(msg.meta.actionsDetected)}{" "}
                              aksiyon
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Live loading state */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[90%] space-y-2.5">
                  {activeAgent && <AgentBadge agent={activeAgent} />}
                  {liveMemory && <MemoryIndicator memory={liveMemory} />}
                  {livePlan && <AutonomousPlanView plan={livePlan} />}
                  {liveTaskPlan && (
                    <TaskStepsView taskPlan={liveTaskPlan} />
                  )}
                  {pipelineSteps.length > 0 && (
                    <PipelineStepsView steps={pipelineSteps} />
                  )}
                  {liveAnalysis && (
                    <HealthScoreBadge analysis={liveAnalysis} />
                  )}
                  {liveActions &&
                    liveActions.detected.length > 0 && (
                      <ActionCard actions={liveActions} />
                    )}
                  {liveArtifacts.map((art) => (
                    <ArtifactCard key={art.id} artifact={art} />
                  ))}
                  <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 text-xs text-white/40">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Yanıt oluşturuluyor...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading without steps */}
            {isLoading && pipelineSteps.length === 0 && !liveTaskPlan && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 text-xs text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>Bağlanıyor...</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 bg-[#0d1220]/80 backdrop-blur-sm p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "autonomous"
                    ? "Otonom komut verin: içerik oluştur, sosyal medya planla, analiz yap..."
                    : "Bir soru sorun, analiz isteyin veya komut verin..."}
                  rows={1}
                  disabled={isLoading}
                  className={cn(
                    "w-full resize-none rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:ring-1 disabled:opacity-50",
                    mode === "autonomous"
                      ? "border-fuchsia-500/20 focus:border-fuchsia-500/40 focus:ring-fuchsia-500/20"
                      : "border-white/10 focus:border-cyan-500/40 focus:ring-cyan-500/20",
                  )}
                  style={{ maxHeight: "120px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height =
                      Math.min(target.scrollHeight, 120) + "px";
                  }}
                />
              </div>
              <Button
                onClick={() => smartSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "h-11 w-11 shrink-0 rounded-xl text-white shadow-lg hover:opacity-90 disabled:opacity-30",
                  mode === "autonomous"
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-fuchsia-500/20 hover:shadow-fuchsia-500/30"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/20 hover:shadow-cyan-500/30",
                )}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-white/15">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                <span>{mode === "autonomous" ? "Otonom v5 • 12 Alt Ajan" : "gemma3:4b • Ollama lokal"}</span>
              </div>
              <span>Shift+Enter yeni satır • Enter gönder</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Info (desktop) ────────────────────────────────── */}
      <AnimatePresence>
        {(liveAnalysis || liveTaskPlan || livePlan || approvals.length > 0 || alerts.length > 0 || messages.some(m => m.analysis)) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="hidden lg:flex flex-col border-l border-white/5 bg-[#0b1020] overflow-hidden"
          >
            {/* Tab bar */}
            <div className="flex items-center border-b border-white/5">
              {[
                { id: "analysis" as const, label: "Analiz", icon: <Activity className="h-3 w-3" /> },
                { id: "approvals" as const, label: `Onaylar${approvals.length > 0 ? ` (${approvals.length})` : ""}`, icon: <Shield className="h-3 w-3" /> },
                { id: "alerts" as const, label: `Uyarılar${alerts.length > 0 ? ` (${alerts.length})` : ""}`, icon: <Bell className="h-3 w-3" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-medium transition-colors border-b-2",
                    rightTab === tab.id
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-white/30 hover:text-white/50",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {/* ── Analysis Tab ──────────────────────────────────── */}
                {rightTab === "analysis" && (
                  <>
                    {/* Latest analysis */}
                    {(() => {
                      const latest = liveAnalysis ?? messages.filter(m => m.analysis).pop()?.analysis;
                      if (latest) return <HealthScoreBadge analysis={latest} />;
                      return null;
                    })()}

                    {/* Live autonomous plan */}
                    {livePlan && <AutonomousPlanView plan={livePlan} />}

                    {/* Latest task plan */}
                    {(() => {
                      const latest = liveTaskPlan ?? messages.filter(m => m.taskPlan).pop()?.taskPlan;
                      if (latest) return <TaskStepsView taskPlan={latest} />;
                      return null;
                    })()}

                    {/* Artifacts */}
                    {(() => {
                      const allArtifacts = [
                        ...liveArtifacts,
                        ...messages.flatMap(m => m.artifacts ?? []),
                      ];
                      if (allArtifacts.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-white/40 uppercase">
                            Raporlar
                          </h4>
                          {allArtifacts.map((art) => (
                            <ArtifactCard key={art.id} artifact={art} />
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ── Approvals Tab ────────────────────────────────── */}
                {rightTab === "approvals" && (
                  <>
                    {approvals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-white/20">
                        <CheckCheck className="h-8 w-8 mb-2" />
                        <p className="text-xs">Bekleyen onay yok</p>
                      </div>
                    ) : (
                      approvals.map(a => (
                        <ApprovalCard
                          key={a.approvalId}
                          approval={a}
                          onAction={handleApproval}
                        />
                      ))
                    )}
                  </>
                )}

                {/* ── Alerts Tab ───────────────────────────────────── */}
                {rightTab === "alerts" && (
                  <>
                    {alerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-white/20">
                        <Bell className="h-8 w-8 mb-2" />
                        <p className="text-xs">Aktif uyarı yok</p>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/ai/alerts?check=true");
                              const data = await res.json();
                              if (data.alerts) {
                                setAlerts(data.alerts.map((a: Record<string, unknown>) => ({
                                  id: a.id as string,
                                  type: a.type as string,
                                  severity: a.severity as string,
                                  title: a.title as string,
                                  message: a.message as string,
                                  suggestedAction: a.suggestedAction as string | undefined,
                                  autoActionAvailable: a.autoActionAvailable as boolean | undefined,
                                  detectedAt: a.detectedAt as number,
                                })));
                              }
                            } catch { /* ignore */ }
                          }}
                          className="mt-3 text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Proaktif tarama başlat
                        </button>
                      </div>
                    ) : (
                      alerts.map(a => <AlertCard key={a.id} alert={a} />)
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
