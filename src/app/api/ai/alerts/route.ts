// ─── Atlas Autonomous AI API — Proactive Alerts ─────────────────────────────
// GET    /api/ai/alerts             — List alerts
// POST   /api/ai/alerts             — Acknowledge/resolve/dismiss alert
// POST   /api/ai/alerts/check       — Trigger proactive check
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import {
  getActiveAlerts,
  getAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getAlertStats,
  runProactiveCheck,
  shouldRunCheck,
} from "@/lib/ai/autonomous";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";
  const runCheck = url.searchParams.get("check") === "true";

  // Auto-run proactive check if enough time passed
  if (runCheck || shouldRunCheck()) {
    const supabase = getAdminClient();
    const checkResult = await runProactiveCheck(supabase);
    return Response.json({
      alerts: all ? getAllAlerts() : getActiveAlerts(),
      stats: getAlertStats(),
      lastCheck: checkResult,
    });
  }

  return Response.json({
    alerts: all ? getAllAlerts() : getActiveAlerts(),
    stats: getAlertStats(),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const { alertId, action } = await req.json();

    if (!alertId || !action) {
      return Response.json({ error: "alertId ve action gerekli." }, { status: 400 });
    }

    let result;
    switch (action) {
      case "acknowledge":
        result = acknowledgeAlert(alertId);
        break;
      case "resolve":
        result = resolveAlert(alertId);
        break;
      case "dismiss":
        result = dismissAlert(alertId);
        break;
      default:
        return Response.json({ error: "Geçersiz action. (acknowledge/resolve/dismiss)" }, { status: 400 });
    }

    if (!result) {
      return Response.json({ error: "Alert bulunamadı." }, { status: 404 });
    }

    return Response.json({ success: true, alert: result });
  } catch (err) {
    return Response.json(
      { error: "Alert işlemi hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}
