// ─── Atlas Autonomous AI — Approval System ──────────────────────────────────
// Manages the approval queue for autonomous operations.
//
// Any action that could affect external systems (social posts, emails,
// database mutations, budget spending) requires explicit approval.
//
// In-memory for now — production would use Supabase table.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApprovalRequest, ApprovalType, SubAgentType } from "./types";

// ─── In-Memory Store ────────────────────────────────────────────────────────

const approvals = new Map<string, ApprovalRequest>();

// ─── Create Approval ────────────────────────────────────────────────────────

interface CreateApprovalInput {
  type: ApprovalType;
  title: string;
  description: string;
  data: Record<string, unknown>;
  preview?: string;
  requestedBy: SubAgentType;
  urgency: "low" | "normal" | "high" | "critical";
  planId?: string;
  taskId?: string;
  expiresInMs?: number;
}

export function createApproval(input: CreateApprovalInput): ApprovalRequest {
  const approval: ApprovalRequest = {
    id: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    description: input.description,
    data: input.data,
    preview: input.preview,
    requestedBy: input.requestedBy,
    requestedAt: Date.now(),
    urgency: input.urgency,
    status: "pending",
    planId: input.planId,
    taskId: input.taskId,
    expiresAt: input.expiresInMs ? Date.now() + input.expiresInMs : undefined,
  };

  approvals.set(approval.id, approval);
  return approval;
}

// ─── Resolve Approval ───────────────────────────────────────────────────────

export function resolveApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  options?: { decidedBy?: string; reason?: string },
): ApprovalRequest | null {
  const approval = approvals.get(approvalId);
  if (!approval || approval.status !== "pending") return null;

  approval.status = decision;
  approval.decidedAt = Date.now();
  approval.decidedBy = options?.decidedBy ?? "admin";
  approval.reason = options?.reason;

  return approval;
}

// ─── Query Approvals ────────────────────────────────────────────────────────

export function getPendingApprovals(): ApprovalRequest[] {
  const now = Date.now();
  const results: ApprovalRequest[] = [];

  for (const approval of approvals.values()) {
    // Auto-expire old approvals
    if (approval.expiresAt && approval.expiresAt < now && approval.status === "pending") {
      approval.status = "expired";
      continue;
    }
    if (approval.status === "pending") {
      results.push(approval);
    }
  }

  // Sort by urgency then by time
  const urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  results.sort((a, b) => {
    const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgDiff !== 0) return urgDiff;
    return a.requestedAt - b.requestedAt;
  });

  return results;
}

export function getAllApprovals(limit = 50): ApprovalRequest[] {
  return Array.from(approvals.values())
    .sort((a, b) => b.requestedAt - a.requestedAt)
    .slice(0, limit);
}

export function getApproval(id: string): ApprovalRequest | undefined {
  return approvals.get(id);
}

export function getApprovalsByPlan(planId: string): ApprovalRequest[] {
  return Array.from(approvals.values())
    .filter(a => a.planId === planId)
    .sort((a, b) => a.requestedAt - b.requestedAt);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function getApprovalStats(): {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
} {
  let pending = 0, approved = 0, rejected = 0, expired = 0;
  for (const a of approvals.values()) {
    if (a.status === "pending") pending++;
    else if (a.status === "approved") approved++;
    else if (a.status === "rejected") rejected++;
    else if (a.status === "expired") expired++;
  }
  return { pending, approved, rejected, expired, total: approvals.size };
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export function clearExpiredApprovals(): number {
  const now = Date.now();
  let cleared = 0;
  for (const [id, a] of approvals) {
    if (a.expiresAt && a.expiresAt < now && a.status === "pending") {
      a.status = "expired";
      cleared++;
    }
    // Remove very old resolved approvals (> 24h)
    if (a.status !== "pending" && a.decidedAt && now - a.decidedAt > 24 * 60 * 60 * 1000) {
      approvals.delete(id);
      cleared++;
    }
  }
  return cleared;
}
