// ─── Atlas Copilot — Artifact Generator ─────────────────────────────────────
// Manus AI-level capability: generate downloadable reports & documents.
//
// Artifact types:
//   1. REPORT — Rich HTML/Markdown reports with data tables
//   2. SUMMARY — Executive summaries with KPIs
//   3. TABLE — Structured data tables (CSV-compatible)
//   4. CHECKLIST — Action items / todo lists
//   5. ANALYSIS — Deep analysis results formatted as document
//
// Artifacts are streamed as SSE events with structured content.
// The UI renders them as expandable cards with copy/download buttons.
// ─────────────────────────────────────────────────────────────────────────────
import type { DomainData } from "./types";
import type { DeepAnalysisResult } from "./deep-analysis";

// ─── Artifact Types ─────────────────────────────────────────────────────────

export type ArtifactType = "report" | "summary" | "table" | "checklist" | "analysis";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;          // Markdown content
  data?: Record<string, unknown>[];  // Structured data for tables
  generatedAt: string;
  metadata: {
    recordCount?: number;
    domains?: string[];
    executionMs?: number;
  };
}

// ─── Report Generators ──────────────────────────────────────────────────────

/** Generate executive summary report from domain data */
export function generateExecutiveSummary(
  domains: DomainData[],
  analysis: DeepAnalysisResult | null,
): Artifact {
  const sections: string[] = [];

  sections.push("# 📊 Atlas Platform — Yönetici Özet Raporu");
  sections.push(`**Tarih:** ${new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}`);
  sections.push(`**Oluşturan:** Atlas Copilot v2.0`);
  sections.push("---");

  // Health Score
  if (analysis) {
    const healthEmoji = analysis.health.overall >= 70 ? "🟢" : analysis.health.overall >= 40 ? "🟡" : "🔴";
    sections.push(`## ${healthEmoji} Genel Sağlık Skoru: ${analysis.health.overall}/100\n`);

    if (analysis.health.dimensions.length > 0) {
      sections.push("| Boyut | Skor | Durum | Detay |");
      sections.push("|-------|------|-------|-------|");
      for (const dim of analysis.health.dimensions) {
        const icon = dim.status === "good" ? "🟢" : dim.status === "warning" ? "🟡" : "🔴";
        sections.push(`| ${dim.name} | ${dim.score}/100 | ${icon} ${dim.status} | ${dim.detail} |`);
      }
      sections.push("");
    }
  }

  // Domain summaries
  for (const domain of domains) {
    const data = domain.data;
    sections.push(`## ${domain.label}`);
    sections.push(`*${domain.recordCount} kayıt, ${domain.fetchMs}ms*\n`);

    // Extract key metrics from domain data
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "number") {
        sections.push(`- **${formatMetricName(key)}:** ${formatNumber(value)}`);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        sections.push(`### ${formatMetricName(key)}`);
        for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
          if (typeof subVal === "number" || typeof subVal === "string") {
            sections.push(`- ${formatMetricName(subKey)}: ${typeof subVal === "number" ? formatNumber(subVal) : subVal}`);
          }
        }
      }
    }
    sections.push("");
  }

  // Trends
  if (analysis && analysis.trends.length > 0) {
    sections.push("## 📈 Trend Analizi\n");
    for (const t of analysis.trends) {
      const icon = t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→";
      sections.push(`- **${t.metric}:** ${t.current} (${icon} ${t.changePercent > 0 ? "+" : ""}${t.changePercent}%)`);
      sections.push(`  - ${t.insight}`);
    }
    sections.push("");
  }

  // Anomalies
  if (analysis && analysis.anomalies.length > 0) {
    sections.push("## ⚠️ Dikkat Edilmesi Gerekenler\n");
    for (const a of analysis.anomalies) {
      const icon = a.severity === "critical" ? "🔴" : "🟡";
      sections.push(`- ${icon} **${a.metric}:** ${a.message}`);
    }
    sections.push("");
  }

  // Predictions
  if (analysis && analysis.predictions.length > 0) {
    sections.push("## 🔮 Öngörüler ve Öneriler\n");
    for (const p of analysis.predictions) {
      sections.push(`- ${p}`);
    }
    sections.push("");
  }

  sections.push("---");
  sections.push(`*Bu rapor Atlas Copilot tarafından otomatik olarak oluşturulmuştur.*`);

  return {
    id: crypto.randomUUID(),
    type: "report",
    title: "Yönetici Özet Raporu",
    content: sections.join("\n"),
    generatedAt: new Date().toISOString(),
    metadata: {
      recordCount: domains.reduce((s, d) => s + d.recordCount, 0),
      domains: domains.map(d => d.label),
      executionMs: analysis?.executionMs,
    },
  };
}

/** Generate a data table artifact from query results */
export function generateDataTable(
  title: string,
  rows: Record<string, unknown>[],
  columns?: string[],
): Artifact {
  if (rows.length === 0) {
    return {
      id: crypto.randomUUID(),
      type: "table",
      title,
      content: `## ${title}\n\n*Veri bulunamadı.*`,
      data: [],
      generatedAt: new Date().toISOString(),
      metadata: { recordCount: 0 },
    };
  }

  const cols = columns ?? Object.keys(rows[0]);
  const sections: string[] = [];

  sections.push(`## ${title}`);
  sections.push(`*${rows.length} kayıt*\n`);

  // Markdown table
  sections.push("| " + cols.map(formatMetricName).join(" | ") + " |");
  sections.push("| " + cols.map(() => "---").join(" | ") + " |");

  for (const row of rows.slice(0, 50)) { // Limit to 50 rows
    const cells = cols.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return "-";
      if (typeof val === "number") return formatNumber(val);
      return String(val);
    });
    sections.push("| " + cells.join(" | ") + " |");
  }

  if (rows.length > 50) {
    sections.push(`\n*...ve ${rows.length - 50} kayıt daha*`);
  }

  return {
    id: crypto.randomUUID(),
    type: "table",
    title,
    content: sections.join("\n"),
    data: rows,
    generatedAt: new Date().toISOString(),
    metadata: { recordCount: rows.length },
  };
}

/** Generate action checklist from analysis */
export function generateChecklist(
  analysis: DeepAnalysisResult,
): Artifact {
  const items: string[] = [];

  items.push("# ✅ Aksiyon Planı\n");
  items.push(`**Tarih:** ${new Date().toLocaleDateString("tr-TR")}`);
  items.push(`**Sistem Sağlığı:** ${analysis.health.overall}/100\n`);

  let priority = 1;

  // Critical anomalies first
  for (const a of analysis.anomalies.filter(a => a.severity === "critical")) {
    items.push(`- [ ] **[P${priority}] 🔴 ${a.metric}:** ${a.message}`);
    priority++;
  }

  // Warning anomalies
  for (const a of analysis.anomalies.filter(a => a.severity === "warning")) {
    items.push(`- [ ] **[P${priority}] 🟡 ${a.metric}:** ${a.message}`);
    priority++;
  }

  // Dimension-based actions
  for (const dim of analysis.health.dimensions.filter(d => d.status !== "good")) {
    items.push(`- [ ] **[P${priority}] ${dim.name}:** ${dim.detail} — iyileştirme gerekli`);
    priority++;
  }

  // Prediction-based actions
  for (const p of analysis.predictions) {
    items.push(`- [ ] **[P${priority}]** ${p}`);
    priority++;
  }

  if (priority === 1) {
    items.push("✅ Tüm sistemler normal — acil aksiyon gerekmiyor.");
  }

  return {
    id: crypto.randomUUID(),
    type: "checklist",
    title: "Aksiyon Planı",
    content: items.join("\n"),
    generatedAt: new Date().toISOString(),
    metadata: {
      recordCount: priority - 1,
    },
  };
}

/** Detect if user message requests a report/artifact */
export function detectArtifactRequest(message: string): ArtifactType | null {
  const lower = message.toLowerCase();

  if (lower.match(/rapor|report|döküman|doküman|belge/)) return "report";
  if (lower.match(/özet|summary|executive/)) return "summary";
  if (lower.match(/tablo|table|liste|csv|export|dışa.*aktar/)) return "table";
  if (lower.match(/aksiyon|checklist|yapılacak|todo|plan/)) return "checklist";
  if (lower.match(/analiz|analysis|derinlemesine|detaylı.*analiz/)) return "analysis";

  return null;
}

// ─── Formatting Utilities ───────────────────────────────────────────────────

function formatMetricName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toLocaleString("tr-TR");
  return n.toFixed(2);
}
