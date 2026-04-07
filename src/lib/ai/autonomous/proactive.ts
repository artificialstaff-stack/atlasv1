// ─── Atlas Autonomous AI — Proactive Intelligence ───────────────────────────
// The "always-on" monitoring system that detects anomalies, trends, and
// opportunities WITHOUT user prompting.
//
// Features:
// - Periodic health checks (simulated cron)
// - Anomaly detection from deep-analysis
// - Threshold-based alerts
// - Trend detection & opportunity alerts
// - Auto-suggest actions for detected issues
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ProactiveAlert, AlertType } from "./types";
import { runDeepAnalysis } from "@/lib/ai/autonomous/deep-analysis";

type Db = SupabaseClient<Database>;

// ─── Alert Store (in-memory) ────────────────────────────────────────────────

const alerts = new Map<string, ProactiveAlert>();
let lastCheckAt = 0;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Alert Creation ─────────────────────────────────────────────────────────

function createAlert(input: {
  type: AlertType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: Record<string, unknown>;
  suggestedAction?: string;
  autoActionAvailable?: boolean;
}): ProactiveAlert {
  const alert: ProactiveAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    data: input.data,
    suggestedAction: input.suggestedAction,
    autoActionAvailable: input.autoActionAvailable ?? false,
    detectedAt: Date.now(),
    status: "active",
  };

  alerts.set(alert.id, alert);
  return alert;
}

// ─── Proactive Check Engine ─────────────────────────────────────────────────

interface ProactiveCheckResult {
  alertsGenerated: number;
  healthScore: number;
  checkDurationMs: number;
  alerts: ProactiveAlert[];
}

export async function runProactiveCheck(supabase: Db): Promise<ProactiveCheckResult> {
  const start = Date.now();
  const newAlerts: ProactiveAlert[] = [];

  try {
    // Run deep analysis
    const analysis = await runDeepAnalysis(supabase);

    // ── Health Score Alerts ──────────────────────────────────────────
    const healthIssues = analysis.health.dimensions.filter(d => d.status !== "good").map(d => d.detail);
    if (analysis.health.overall < 40) {
      newAlerts.push(createAlert({
        type: "risk",
        severity: "critical",
        title: "Kritik Sağlık Skoru",
        message: `Platform sağlık skoru ${analysis.health.overall}/100'e düştü. ${healthIssues.join(", ")}`,
        data: { health: analysis.health },
        suggestedAction: "Acil durum toplantısı yapın ve kritik metrikleri inceleyin",
        autoActionAvailable: false,
      }));
    } else if (analysis.health.overall < 60) {
      newAlerts.push(createAlert({
        type: "threshold",
        severity: "warning",
        title: "Düşük Sağlık Skoru",
        message: `Platform sağlık skoru ${analysis.health.overall}/100. Dikkat gerektiren alanlar: ${healthIssues.join(", ")}`,
        data: { health: analysis.health },
        suggestedAction: "Sağlık raporu oluşturup sorunları kategorize edin",
      }));
    }

    // ── Anomaly Alerts ──────────────────────────────────────────────
    for (const anomaly of analysis.anomalies) {
      const alertSev = anomaly.severity === "critical" ? "critical" : "warning";
      newAlerts.push(createAlert({
        type: "anomaly",
        severity: alertSev,
        title: `Anomali: ${anomaly.metric}`,
        message: anomaly.message,
        data: { anomaly },
        suggestedAction: `${anomaly.metric} metriğini detaylı inceleyin`,
      }));
    }

    // ── Trend Alerts ────────────────────────────────────────────────
    for (const trend of analysis.trends) {
      const isPositive = trend.direction === "up" && trend.changePercent > 10;
      const isNegative = trend.direction === "down" && trend.changePercent < -10;

      if (isPositive) {
        newAlerts.push(createAlert({
          type: "opportunity",
          severity: "info",
          title: `Fırsat: ${trend.metric}`,
          message: `${trend.metric} yukarı yönlü trend gösteriyor. Bu fırsatı değerlendirin.`,
          data: { trend },
          suggestedAction: `${trend.metric} trendinden faydalanmak için kampanya planlayın`,
          autoActionAvailable: true,
        }));
      }

      if (isNegative) {
        newAlerts.push(createAlert({
          type: "risk",
          severity: "warning",
          title: `Risk: ${trend.metric} düşüşte`,
          message: `${trend.metric} aşağı yönlü trend. Müdahale gerekebilir.`,
          data: { trend },
          suggestedAction: `${trend.metric} düşüşünün nedenlerini analiz edin`,
        }));
      }
    }

    // ── Threshold-Based Alerts (from raw data) ──────────────────────
    // Check for specific business thresholds
    await checkBusinessThresholds(supabase, newAlerts);

    lastCheckAt = Date.now();

    return {
      alertsGenerated: newAlerts.length,
      healthScore: analysis.health.overall,
      checkDurationMs: Date.now() - start,
      alerts: newAlerts,
    };
  } catch (err) {
    console.error("[Atlas Proactive] Check failed:", err);
    return {
      alertsGenerated: 0,
      healthScore: 0,
      checkDurationMs: Date.now() - start,
      alerts: [],
    };
  }
}

// ─── Business Threshold Checks ──────────────────────────────────────────────

async function checkBusinessThresholds(supabase: Db, alertList: ProactiveAlert[]) {
  // ── Open contact submissions count ──────────────────────────────────────
  const { count: openTickets } = await supabase
    .from("contact_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  if (openTickets && openTickets > 20) {
    alertList.push(createAlert({
      type: "threshold",
      severity: openTickets > 50 ? "critical" : "warning",
      title: `${openTickets} Açık Destek Talebi`,
      message: `Açık destek talebi sayısı ${openTickets}'e ulaştı. Yanıt süresi uzayabilir.`,
      data: { openTickets },
      suggestedAction: "Destek ekibini bilgilendirin ve öncelikleri gözden geçirin",
      autoActionAvailable: true,
    }));
  }

  // ── Pending orders ────────────────────────────────────────────────
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (pendingOrders && pendingOrders > 10) {
    alertList.push(createAlert({
      type: "threshold",
      severity: pendingOrders > 30 ? "critical" : "warning",
      title: `${pendingOrders} Bekleyen Sipariş`,
      message: `İşlenmeyi bekleyen sipariş sayısı ${pendingOrders}. Müşteri memnuniyeti etkilenebilir.`,
      data: { pendingOrders },
      suggestedAction: "Lojistik ekibini uyarın ve sevkiyat süreçlerini hızlandırın",
    }));
  }

  // ── Stalled onboarding ────────────────────────────────────────────
  const { count: stalledOnboarding } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_status", "pending");

  if (stalledOnboarding && stalledOnboarding > 5) {
    alertList.push(createAlert({
      type: "risk",
      severity: "warning",
      title: `${stalledOnboarding} Durmuş Onboarding`,
      message: `${stalledOnboarding} müşterinin onboarding süreci ilerlemedi. Churn riski var.`,
      data: { stalledOnboarding },
      suggestedAction: "Otomatik onboarding e-postası gönderin veya kendileriyle iletişime geçin",
      autoActionAvailable: true,
    }));
  }
}

// ─── Alert Management ───────────────────────────────────────────────────────

export function getActiveAlerts(): ProactiveAlert[] {
  return Array.from(alerts.values())
    .filter(a => a.status === "active")
    .sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.detectedAt - a.detectedAt;
    });
}

export function getAllAlerts(limit = 100): ProactiveAlert[] {
  return Array.from(alerts.values())
    .sort((a, b) => b.detectedAt - a.detectedAt)
    .slice(0, limit);
}

export function acknowledgeAlert(alertId: string): ProactiveAlert | null {
  const alert = alerts.get(alertId);
  if (!alert) return null;
  alert.status = "acknowledged";
  alert.acknowledgedAt = Date.now();
  return alert;
}

export function resolveAlert(alertId: string): ProactiveAlert | null {
  const alert = alerts.get(alertId);
  if (!alert) return null;
  alert.status = "resolved";
  alert.resolvedAt = Date.now();
  return alert;
}

export function dismissAlert(alertId: string): ProactiveAlert | null {
  const alert = alerts.get(alertId);
  if (!alert) return null;
  alert.status = "dismissed";
  return alert;
}

export function getAlertStats(): {
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
  info: number;
  lastCheckAt: number;
} {
  let active = 0, acknowledged = 0, resolved = 0;
  let critical = 0, warning = 0, info = 0;

  for (const a of alerts.values()) {
    if (a.status === "active") active++;
    else if (a.status === "acknowledged") acknowledged++;
    else if (a.status === "resolved") resolved++;

    if (a.severity === "critical") critical++;
    else if (a.severity === "warning") warning++;
    else info++;
  }

  return { active, acknowledged, resolved, critical, warning, info, lastCheckAt };
}

/** Check if enough time has passed for a new proactive check */
export function shouldRunCheck(): boolean {
  return Date.now() - lastCheckAt > CHECK_INTERVAL_MS;
}
