// ─── Atlas Autonomous AI API — Approvals ─────────────────────────────────────
// GET    /api/ai/approvals          — List pending approvals
// POST   /api/ai/approvals          — Resolve an approval (approve/reject)
// ─────────────────────────────────────────────────────────────────────────────
import { requireAdmin } from "@/features/auth/guards";
import {
  getPendingApprovals,
  getAllApprovals,
  resolveApproval,
  getApprovalStats,
} from "@/lib/ai/autonomous";

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  return Response.json({
    approvals: all ? getAllApprovals() : getPendingApprovals(),
    stats: getApprovalStats(),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const { approvalId, decision, reason } = await req.json();

    if (!approvalId || !decision) {
      return Response.json({ error: "approvalId ve decision gerekli." }, { status: 400 });
    }

    if (decision !== "approved" && decision !== "rejected") {
      return Response.json({ error: "decision: 'approved' veya 'rejected' olmalı." }, { status: 400 });
    }

    const result = resolveApproval(approvalId, decision, {
      decidedBy: admin.id ?? "admin",
      reason,
    });

    if (!result) {
      return Response.json({ error: "Onay bulunamadı veya zaten çözümlendi." }, { status: 404 });
    }

    return Response.json({ success: true, approval: result });
  } catch (err) {
    return Response.json(
      { error: "Onay işlemi hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}
