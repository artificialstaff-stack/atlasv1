"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  ShoppingCart,
  Headphones,
  BarChart3,
  Store,
  ChevronDown,
  Minimize2,
  Maximize2,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  tasks: Array<{ id: number; type: string; label: string; domain?: string; status: string }>;
  reasoning: string;
  estimatedMs: number;
}

interface AnalysisData {
  health: { overall: number; dimensions: Array<{ name: string; score: number; status: string }> };
  anomalyCount: number;
  trendCount: number;
  predictionCount: number;
  anomalies: Array<{ type: string; severity: string; message: string }>;
  predictions: Array<{ type: string; confidence: number; description: string }>;
}

interface ActionData {
  detected: Array<{ type: string; description: string; confidence: number; requiresConfirmation: boolean }>;
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

// ─── Agent Icons ────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ReactNode> = {
  customer: <Users className="h-3 w-3" />,
  commerce: <ShoppingCart className="h-3 w-3" />,
  marketing: <Megaphone className="h-3 w-3" />,
  finance: <DollarSign className="h-3 w-3" />,
  operations: <Settings className="h-3 w-3" />,
  strategy: <BarChart3 className="h-3 w-3" />,
  coordinator: <Brain className="h-3 w-3" />,
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

// ─── Suggestion Categories ──────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    label: "Genel Bakış",
    color: "text-cyan-400",
    items: [
      "Platformun genel durumunu özetle",
      "Bugün kritik bir durum var mı?",
      "KPI dashboard göster",
    ],
  },
  {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Müşteriler",
    color: "text-blue-400",
    items: [
      "Son 7 günde kaç yeni müşteri kaydoldu?",
      "Onboarding tamamlanma oranı nedir?",
      "Şirket kurulum süreçleri nasıl gidiyor?",
    ],
  },
  {
    icon: <ShoppingCart className="h-3.5 w-3.5" />,
    label: "Siparişler",
    color: "text-amber-400",
    items: [
      "Bekleyen siparişleri listele",
      "Toplam sipariş geliri ne kadar?",
      "Hangi platformdan en çok sipariş geliyor?",
    ],
  },
  {
    icon: <Store className="h-3.5 w-3.5" />,
    label: "Pazaryeri",
    color: "text-purple-400",
    items: [
      "Amazon ve eBay performansını karşılaştır",
      "Pazaryeri bazlı aylık gelir nedir?",
      "Reklam kampanyalarının ROAS değeri nedir?",
    ],
  },
  {
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: "Finans",
    color: "text-emerald-400",
    items: [
      "Toplam gelir ve gider ne kadar?",
      "Net kâr marjı kaç yüzde?",
      "Tahsilat oranını göster",
    ],
  },
  {
    icon: <Headphones className="h-3.5 w-3.5" />,
    label: "Destek",
    color: "text-orange-400",
    items: [
      "Kaç açık destek talebi var?",
      "Yüksek öncelikli ticket'lar neler?",
      "Bekleyen form başvurularını göster",
    ],
  },
];

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={`code-${i}`} className="my-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={`h3-${i}`} className="mt-3 mb-1 text-xs font-bold text-white/90">{processInline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={`h2-${i}`} className="mt-3 mb-1 text-sm font-bold text-white">{processInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={`h1-${i}`} className="mt-3 mb-1.5 text-sm font-bold text-white">{processInline(line.slice(2))}</h2>);
      i++; continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s-:|]+\|$/))
        .map(l => l.split("|").filter(Boolean).map(c => c.trim()));
      if (rows.length > 0) {
        elements.push(
          <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="px-2 py-1.5 text-left font-semibold text-white/80">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 text-white/70">{processInline(cell)}</td>
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

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-white/10" />);
      i++; continue;
    }

    // Bullet lists
    if (line.match(/^\s*[-*]\s/)) {
      const bullets: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        bullets.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1 ml-3 space-y-0.5">
          {bullets.map((b, bi) => (
            <li key={bi} className="flex items-start gap-1.5 text-xs text-white/70">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              <span>{processInline(b)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered lists
    if (line.match(/^\s*\d+[.)]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+[.)]\s/)) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1 ml-3 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-1.5 text-xs text-white/70">
              <span className="mt-0.5 shrink-0 text-[10px] font-medium text-white/50">{ii + 1}.</span>
              <span>{processInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-1" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`} className="text-xs leading-relaxed text-white/70">{processInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++} className="font-semibold text-white/90">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) parts.push(remaining.slice(0, codeMatch.index));
      parts.push(<code key={key++} className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-mono text-emerald-300">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) parts.push(remaining.slice(0, italicMatch.index));
      parts.push(<em key={key++} className="italic text-white/60">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ─── Pipeline Steps Display ─────────────────────────────────────────────────

function PipelineStepsView({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="mb-2 space-y-1 rounded-lg border border-white/5 bg-white/[0.02] p-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          {step.status === "done" ? (
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-400" />
          )}
          <span className={cn(
            "flex-1",
            step.status === "done" ? "text-white/40" : "text-white/70",
          )}>
            {step.message}
          </span>
          {step.durationMs !== undefined && (
            <span className="shrink-0 text-white/20">{step.durationMs}ms</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Manus-Style Task Steps ─────────────────────────────────────────────────

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
    <div className="mb-2 rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-[10px] hover:bg-white/[0.02] transition-colors"
      >
        <Target className="h-3 w-3 text-cyan-400" />
        <span className="text-white/60 font-medium">Görev Planı</span>
        <span className={cn(
          "rounded-full border px-1.5 py-0.5 text-[8px] font-bold",
          complexityColors[taskPlan.complexity] ?? "text-white/40",
        )}>
          {complexityLabels[taskPlan.complexity] ?? taskPlan.complexity}
        </span>
        <span className="flex-1" />
        <span className="text-white/20">{taskPlan.tasks.filter(t => t.status === "done").length}/{taskPlan.totalSteps}</span>
        <ChevronDown className={cn("h-3 w-3 text-white/30 transition-transform", collapsed && "-rotate-90")} />
      </button>

      {/* Tasks */}
      {!collapsed && (
        <div className="border-t border-white/5 px-2.5 py-1.5 space-y-1">
          {taskPlan.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-[10px]">
              {task.status === "done" ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
              ) : task.status === "running" ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-400" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 text-white/20" />
              )}
              <span className={cn(
                "flex-1",
                task.status === "done" ? "text-white/35 line-through" : task.status === "running" ? "text-white/80" : "text-white/50",
              )}>
                {task.label}
              </span>
              {task.domain && (
                <span className={cn(
                  "rounded px-1 py-0.5 text-[8px] border",
                  AGENT_COLORS[task.domain] ?? "text-white/30",
                )}>
                  {task.domain}
                </span>
              )}
            </div>
          ))}
          {taskPlan.reasoning && (
            <p className="mt-1 text-[9px] text-white/20 italic">{taskPlan.reasoning}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Health Score Badge ─────────────────────────────────────────────────────

function HealthScoreBadge({ analysis }: { analysis: AnalysisData }) {
  const score = analysis.health.overall;
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (s >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };
  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Sağlıklı";
    if (s >= 60) return "Dikkat";
    return "Kritik";
  };

  return (
    <div className="mb-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 space-y-2">
      {/* Score header */}
      <div className="flex items-center gap-2">
        <Heart className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[10px] font-medium text-white/60">Platform Sağlığı</span>
        <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold", getScoreColor(score))}>
          {score}/100 — {getScoreLabel(score)}
        </span>
      </div>

      {/* Dimension bars */}
      <div className="space-y-1">
        {analysis.health.dimensions.map((dim, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-white/40">{dim.name}</span>
              <span className={cn(
                dim.score >= 80 ? "text-emerald-400" : dim.score >= 60 ? "text-amber-400" : "text-red-400",
              )}>{dim.score}</span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  dim.score >= 80 ? "bg-emerald-500" : dim.score >= 60 ? "bg-amber-500" : "bg-red-500",
                )}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Anomalies quick view */}
      {analysis.anomalyCount > 0 && (
        <div className="flex items-center gap-1.5 text-[9px] text-amber-400/80">
          <AlertTriangle className="h-3 w-3" />
          <span>{analysis.anomalyCount} anomali tespit edildi</span>
        </div>
      )}
    </div>
  );
}

// ─── Action Card ────────────────────────────────────────────────────────────

function ActionCard({ actions }: { actions: ActionData }) {
  return (
    <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-[10px]">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-medium text-amber-300">Aksiyonlar Tespit Edildi</span>
        <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-300">
          {actions.detected.length}
        </span>
      </div>
      {actions.detected.map((action, i) => (
        <div key={i} className="flex items-start gap-2 text-[10px]">
          {action.requiresConfirmation ? (
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
          )}
          <div className="flex-1">
            <span className="text-white/60">{action.description}</span>
            {action.requiresConfirmation && (
              <span className="ml-1 text-[8px] text-amber-400/60">(onay gerekli)</span>
            )}
          </div>
          <span className="text-[8px] text-white/20">{Math.round(action.confidence * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Artifact Card ──────────────────────────────────────────────────────────

function ArtifactCard({ artifact }: { artifact: ArtifactData }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
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
    report: <FileText className="h-3 w-3" />,
    summary: <BarChart3 className="h-3 w-3" />,
    table: <Layers className="h-3 w-3" />,
    checklist: <CheckCircle2 className="h-3 w-3" />,
    analysis: <TrendingUp className="h-3 w-3" />,
  };

  return (
    <div className="mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
          {typeIcons[artifact.type] ?? <FileText className="h-3 w-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-cyan-300 truncate">{artifact.title}</p>
          <p className="text-[8px] text-white/30">{artifact.type} • {Math.round(artifact.content.length / 1024)}KB</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex h-6 w-6 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Kopyala"
          >
            {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={handleDownload}
            className="flex h-6 w-6 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="İndir"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-6 w-6 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content preview */}
      {expanded && (
        <div className="border-t border-cyan-500/10 px-2.5 py-2 max-h-[200px] overflow-y-auto">
          <pre className="text-[9px] text-white/50 whitespace-pre-wrap font-mono leading-relaxed">{artifact.content}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Memory Indicator ───────────────────────────────────────────────────────

function MemoryIndicator({ memory }: { memory: MemoryData }) {
  if (memory.entityCount === 0 && memory.conversationCount === 0) return null;
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] text-purple-400/60">
      <Brain className="h-3 w-3" />
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
          <span className="truncate max-w-[120px]">{memory.entities.join(", ")}</span>
        </>
      )}
    </div>
  );
}

// ─── Agent Badge ────────────────────────────────────────────────────────────

function AgentBadge({ agent }: { agent: { role: string; label: string } }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
      AGENT_COLORS[agent.role] ?? "bg-white/5 text-white/60 border-white/10",
    )}>
      {AGENT_ICONS[agent.role] ?? <Bot className="h-3 w-3" />}
      <span>{agent.label}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [activeAgent, setActiveAgent] = useState<{ role: string; label: string } | null>(null);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Manus-level state
  const [liveTaskPlan, setLiveTaskPlan] = useState<TaskPlanData | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<AnalysisData | null>(null);
  const [liveActions, setLiveActions] = useState<ActionData | null>(null);
  const [liveArtifacts, setLiveArtifacts] = useState<ArtifactData[]>([]);
  const [liveMemory, setLiveMemory] = useState<MemoryData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pipelineSteps]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Send Message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput("");
      setError(null);
      setPipelineSteps([]);
      setActiveAgent(null);
      setContextSummary(null);
      setActiveCategory(null);
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

      // Abort controller for cancellation
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            sessionId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("Yanıt gövdesi yok");

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = crypto.randomUUID();
        let agentInfo: { role: string; label: string; icon: string } | null = null;
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

          // Process complete SSE lines
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
                  // Mark previous step as done
                  if (steps.length > 0) {
                    steps[steps.length - 1].status = "done";
                  }
                  steps.push(step);
                  setPipelineSteps([...steps]);
                  break;
                }

                case "tasks": {
                  // Manus-style task decomposition
                  currentTaskPlan = {
                    complexity: event.data.complexity as string,
                    totalSteps: event.data.totalSteps as number,
                    tasks: (event.data.tasks as TaskPlanData["tasks"]).map(t => ({ ...t, status: "pending" })),
                    reasoning: event.data.reasoning as string,
                    estimatedMs: event.data.estimatedMs as number,
                  };
                  setLiveTaskPlan({ ...currentTaskPlan });
                  break;
                }

                case "task_update": {
                  // Update individual subtask status
                  if (currentTaskPlan) {
                    const taskId = event.data.taskId as number;
                    const status = event.data.status as string;
                    currentTaskPlan.tasks = currentTaskPlan.tasks.map(t =>
                      t.id === taskId ? { ...t, status } : t,
                    );
                    setLiveTaskPlan({ ...currentTaskPlan });
                  }
                  break;
                }

                case "memory": {
                  // Memory context info
                  currentMemory = {
                    entityCount: event.data.entityCount as number,
                    entities: event.data.entities as string[],
                    conversationCount: event.data.conversationCount as number,
                    sessionSummary: (event.data.sessionSummary as string) ?? null,
                  };
                  setLiveMemory({ ...currentMemory });
                  break;
                }

                case "analysis": {
                  // Deep analysis results
                  currentAnalysis = {
                    health: event.data.health as AnalysisData["health"],
                    anomalyCount: event.data.anomalyCount as number,
                    trendCount: event.data.trendCount as number,
                    predictionCount: event.data.predictionCount as number,
                    anomalies: (event.data.anomalies as AnalysisData["anomalies"]) ?? [],
                    predictions: (event.data.predictions as AnalysisData["predictions"]) ?? [],
                  };
                  setLiveAnalysis({ ...currentAnalysis });
                  break;
                }

                case "action": {
                  // Action detection
                  currentActions = {
                    detected: event.data.detected as ActionData["detected"],
                    autoExecute: event.data.autoExecute as number,
                    needsConfirmation: event.data.needsConfirmation as number,
                  };
                  setLiveActions({ ...currentActions });
                  break;
                }

                case "artifact": {
                  // Generated report/document
                  const artifact: ArtifactData = {
                    id: event.data.id as string,
                    type: event.data.type as string,
                    title: event.data.title as string,
                    content: event.data.content as string,
                    metadata: event.data.metadata as Record<string, unknown> | undefined,
                  };
                  currentArtifacts.push(artifact);
                  setLiveArtifacts([...currentArtifacts]);
                  break;
                }

                case "intent":
                case "plan":
                case "context": {
                  // Update context summary for display
                  if (event.type === "context") {
                    const total = event.data.totalRecords as number;
                    const ms = event.data.totalFetchMs as number;
                    setContextSummary(`${total} kayıt, ${ms}ms`);
                  }
                  break;
                }

                case "agent": {
                  agentInfo = {
                    role: event.data.role as string,
                    label: event.data.label as string,
                    icon: event.data.icon as string,
                  };
                  setActiveAgent({ role: agentInfo.role, label: agentInfo.label });
                  break;
                }

                case "text": {
                  const chunk = event.data.content as string;
                  assistantContent += chunk;

                  if (!assistantMessageAdded) {
                    // Mark all pipeline steps as done
                    steps.forEach(s => { s.status = "done"; });
                    setPipelineSteps([...steps]);

                    // Add assistant message with all accumulated data
                    setMessages(prev => [
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
                        artifacts: currentArtifacts.length > 0 ? [...currentArtifacts] : undefined,
                        memoryInfo: currentMemory ?? undefined,
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
                  // Final update with metadata
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? {
                            ...m,
                            meta: event.data as Record<string, unknown>,
                            taskPlan: currentTaskPlan ?? m.taskPlan,
                            analysis: currentAnalysis ?? m.analysis,
                            actions: currentActions ?? m.actions,
                            artifacts: currentArtifacts.length > 0 ? [...currentArtifacts] : m.artifacts,
                            memoryInfo: currentMemory ?? m.memoryInfo,
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
              // Skip unparseable lines
              if (parseErr instanceof Error && parseErr.message !== "PIPELINE_ERROR") {
                // If it looks like an actual error thrown from error event, rethrow
                if (dataLine.includes('"type":"error"')) throw parseErr;
              }
            }
          }
        }

        // Handle empty response
        if (!assistantContent.trim() && assistantMessageAdded) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: "Yanıt oluşturulamadı. Lütfen farklı bir soru deneyin." }
                : m,
            ),
          );
        } else if (!assistantMessageAdded) {
          setMessages(prev => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: "Yanıt alınamadı. Ollama servisinin çalıştığından emin olun.",
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
    [input, isLoading, messages, sessionId],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPipelineSteps([]);
    setActiveAgent(null);
    setContextSummary(null);
    setIsLoading(false);
    setLiveTaskPlan(null);
    setLiveAnalysis(null);
    setLiveActions(null);
    setLiveArtifacts([]);
    setLiveMemory(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setOpen(true)}
              className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105"
            >
              <Sparkles className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1a]/95 shadow-2xl shadow-black/40 backdrop-blur-xl",
              expanded
                ? "h-[90vh] w-[720px] max-w-[calc(100vw-2rem)]"
                : "h-[640px] w-[440px] max-w-[calc(100vw-2rem)]",
            )}
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Atlas Copilot</h3>
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
                    v3.0
                  </span>
                </div>
                <p className="text-[10px] text-white/40 truncate">
                  {activeAgent
                    ? `${activeAgent.label} aktif`
                    : contextSummary
                      ? `Son: ${contextSummary}`
                      : "Manus AI-level Yönetim Asistanı"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/80" onClick={clearChat}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/80" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/80" onClick={() => setOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ── Messages ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Welcome / Suggestions */}
              {messages.length === 0 && !isLoading && (
                <div className="space-y-4 pt-2">
                  <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/10">
                      <Zap className="h-6 w-6 text-cyan-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white/90">Atlas Copilot</h4>
                    <p className="text-[11px] text-white/40 max-w-xs mx-auto leading-relaxed">
                      Manus AI seviyesinde yapay zeka asistanınız.
                      Hafıza, derin analiz, aksiyon yürütme, rapor üretimi — her şey otomatik.
                    </p>
                  </div>

                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1 justify-center px-2">
                    {SUGGESTIONS.map((cat, ci) => (
                      <button
                        key={ci}
                        onClick={() => setActiveCategory(activeCategory === ci ? null : ci)}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border",
                          activeCategory === ci
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white/70",
                        )}
                      >
                        <span className={cat.color}>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Suggestion items */}
                  <AnimatePresence mode="wait">
                    {activeCategory !== null && (
                      <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 px-1"
                      >
                        {SUGGESTIONS[activeCategory].items.map((item, ii) => (
                          <button
                            key={ii}
                            onClick={() => sendMessage(item)}
                            className="w-full flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left text-[11px] text-white/60 transition-all hover:bg-white/[0.06] hover:text-white/80 hover:border-white/10"
                          >
                            <Send className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                            <span>{item}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white"
                      : "bg-white/[0.04] border border-white/5",
                  )}>
                    {/* Agent badge for assistant messages */}
                    {msg.role === "assistant" && msg.agent && (
                      <div className="mb-1.5">
                        <AgentBadge agent={msg.agent} />
                      </div>
                    )}

                    {/* Memory indicator */}
                    {msg.role === "assistant" && msg.memoryInfo && (
                      <MemoryIndicator memory={msg.memoryInfo} />
                    )}

                    {/* Manus-style task plan */}
                    {msg.role === "assistant" && msg.taskPlan && (
                      <TaskStepsView taskPlan={msg.taskPlan} />
                    )}

                    {/* Pipeline steps (collapsed in message) */}
                    {msg.role === "assistant" && msg.pipelineSteps && msg.pipelineSteps.length > 0 && (
                      <PipelineStepsView steps={msg.pipelineSteps} />
                    )}

                    {/* Deep analysis / health score */}
                    {msg.role === "assistant" && msg.analysis && (
                      <HealthScoreBadge analysis={msg.analysis} />
                    )}

                    {/* Actions */}
                    {msg.role === "assistant" && msg.actions && msg.actions.detected.length > 0 && (
                      <ActionCard actions={msg.actions} />
                    )}

                    {/* Content */}
                    {msg.role === "user" ? (
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                    ) : (
                      <RenderMarkdown content={msg.content} />
                    )}

                    {/* Artifacts */}
                    {msg.role === "assistant" && msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="mt-2">
                        {msg.artifacts.map((art) => (
                          <ArtifactCard key={art.id} artifact={art} />
                        ))}
                      </div>
                    )}

                    {/* Meta info */}
                    {msg.meta && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-white/5 pt-1.5 text-[9px] text-white/25">
                        <span>{(msg.meta.pipelineMs as number)}ms toplam</span>
                        <span>•</span>
                        <span>{(msg.meta.totalRecords as number)} kayıt</span>
                        <span>•</span>
                        <span>{msg.meta.agentLabel as string}</span>
                        {msg.meta.complexity != null && (
                          <>
                            <span>•</span>
                            <span>{String(msg.meta.complexity)}</span>
                          </>
                        )}
                        {Number(msg.meta.actionsDetected) > 0 && (
                          <>
                            <span>•</span>
                            <span>{Number(msg.meta.actionsDetected)} aksiyon</span>
                          </>
                        )}
                        {Number(msg.meta.entitiesFound) > 0 && (
                          <>
                            <span>•</span>
                            <span>{Number(msg.meta.entitiesFound)} varlık</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Live pipeline & Manus components while loading */}
              {isLoading && (pipelineSteps.length > 0 || liveTaskPlan) && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl bg-white/[0.04] border border-white/5 px-3 py-2 space-y-1">
                    {activeAgent && (
                      <div className="mb-1.5">
                        <AgentBadge agent={activeAgent} />
                      </div>
                    )}

                    {/* Live memory indicator */}
                    {liveMemory && <MemoryIndicator memory={liveMemory} />}

                    {/* Live task plan */}
                    {liveTaskPlan && <TaskStepsView taskPlan={liveTaskPlan} />}

                    {/* Pipeline steps */}
                    {pipelineSteps.length > 0 && <PipelineStepsView steps={pipelineSteps} />}

                    {/* Live analysis */}
                    {liveAnalysis && <HealthScoreBadge analysis={liveAnalysis} />}

                    {/* Live actions */}
                    {liveActions && liveActions.detected.length > 0 && <ActionCard actions={liveActions} />}

                    {/* Live artifacts */}
                    {liveArtifacts.map((art) => (
                      <ArtifactCard key={art.id} artifact={art} />
                    ))}

                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Yanıt hazırlanıyor...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading without steps */}
              {isLoading && pipelineSteps.length === 0 && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/5 px-3 py-2 text-[10px] text-white/40">
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                    <span>Bağlanıyor...</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ──────────────────────────────────────────────── */}
            <div className="border-t border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Bir soru sorun veya komut verin..."
                    rows={1}
                    disabled={isLoading}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white placeholder-white/30 outline-none transition-all focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50"
                    style={{ maxHeight: "80px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 80) + "px";
                    }}
                  />
                </div>
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:opacity-90 disabled:opacity-30"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Quick info bar */}
              <div className="mt-2 flex items-center justify-between text-[9px] text-white/20">
                <div className="flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5" />
                  <span>gemma3:4b • Ollama</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>6 uzman ajan</span>
                  <span>•</span>
                  <span>25 tablo</span>
                  <span>•</span>
                  <span>hafıza + analiz + aksiyon</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
