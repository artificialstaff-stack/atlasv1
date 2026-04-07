/**
 * ─── Security Guardrails ───
 *
 * Safety checks applied before Jarvis executes any autonomous action.
 * Every proposed action (autofix, background modification, tool invocation)
 * must pass through these guardrails.
 *
 * Rules:
 * 1. Risk Classification — categorize every action by risk level
 * 2. Scope Enforcement — ensure actions stay within declared boundaries
 * 3. Rate Limiting — prevent runaway autonomous operations
 * 4. Content Filtering — block dangerous tool inputs
 * 5. Audit Trail — all decisions are logged
 */

import type { JarvisActionRisk } from "./contracts";
import { createTrace } from "./tracing";

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

export interface GuardrailCheck {
  action: string;
  risk: JarvisActionRisk;
  allowed: boolean;
  reason: string;
  checkedAt: string;
}

export interface ActionProposal {
  action: string;
  toolName: string;
  input: Record<string, unknown>;
  targetFiles?: string[];
  description: string;
}

// ──────────────────────────────────────
// Blocked Patterns
// ──────────────────────────────────────

/** Tools that are never auto-executable */
const BLOCKED_TOOLS = new Set([
  "rm",
  "rm -rf",
  "drop_table",
  "delete_database",
  "git push --force",
  "git reset --hard",
  "truncate",
]);

/** Path patterns that require operator approval */
const SENSITIVE_PATH_PATTERNS = [
  /supabase\/migrations\//,
  /\.env/,
  /docker-compose/,
  /Dockerfile/,
  /next\.config/,
  /middleware\.ts$/,
  /supabase\/config/,
  /package\.json$/,
];

// ──────────────────────────────────────
// Rate Limiter
// ──────────────────────────────────────

const actionCounts = new Map<string, { count: number; windowStart: number }>();
const MAX_ACTIONS_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(toolName: string): boolean {
  const now = Date.now();
  const entry = actionCounts.get(toolName);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    actionCounts.set(toolName, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_ACTIONS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

// ──────────────────────────────────────
// Risk Classification
// ──────────────────────────────────────

export function classifyRisk(proposal: ActionProposal): JarvisActionRisk {
  // Blocked tools are never allowed
  if (BLOCKED_TOOLS.has(proposal.toolName)) {
    return "blocked";
  }

  // Sensitive file paths require operator approval
  if (proposal.targetFiles?.some((f) => SENSITIVE_PATH_PATTERNS.some((p) => p.test(f)))) {
    return "operator-only";
  }

  // File write/delete operations need review
  if (proposal.toolName.includes("write") || proposal.toolName.includes("delete")) {
    return "review-required";
  }

  // Read-only and analysis operations are auto-safe
  if (
    proposal.toolName.includes("read") ||
    proposal.toolName.includes("list") ||
    proposal.toolName.includes("get") ||
    proposal.toolName.includes("check") ||
    proposal.toolName.includes("analyze")
  ) {
    return "auto-safe";
  }

  // Default: require review
  return "review-required";
}

// ──────────────────────────────────────
// Content Validation
// ──────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /eval\s*\(/,
  /Function\s*\(/,
  /child_process/,
  /exec\s*\(/,
  /spawn\s*\(/,
  /require\s*\(\s*['"]child_process/,
  /import\s+.*from\s+['"]child_process/,
  /process\.exit/,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM\s+\w+\s*;/i,
  /TRUNCATE\s+TABLE/i,
];

function validateContent(input: Record<string, unknown>): { safe: boolean; reason: string } {
  const text = JSON.stringify(input);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, reason: `Dangerous pattern detected: ${pattern.source}` };
    }
  }
  return { safe: true, reason: "Content passed validation" };
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Check whether a proposed action is allowed.
 * Returns a GuardrailCheck with the decision and reason.
 */
export function checkGuardrail(proposal: ActionProposal): GuardrailCheck {
  const risk = classifyRisk(proposal);
  const now = new Date().toISOString();

  // Blocked tools
  if (risk === "blocked") {
    return {
      action: proposal.action,
      risk,
      allowed: false,
      reason: `Tool "${proposal.toolName}" is blocked by security policy`,
      checkedAt: now,
    };
  }

  // Rate limit check
  if (!checkRateLimit(proposal.toolName)) {
    return {
      action: proposal.action,
      risk,
      allowed: false,
      reason: `Rate limit exceeded for "${proposal.toolName}"`,
      checkedAt: now,
    };
  }

  // Content validation
  const contentCheck = validateContent(proposal.input);
  if (!contentCheck.safe) {
    return {
      action: proposal.action,
      risk: "blocked",
      allowed: false,
      reason: contentCheck.reason,
      checkedAt: now,
    };
  }

  // Operator-only requires explicit approval (not auto-executable)
  if (risk === "operator-only") {
    return {
      action: proposal.action,
      risk,
      allowed: false,
      reason: "Requires operator approval — sensitive target files",
      checkedAt: now,
    };
  }

  // Review-required: allowed but flagged
  if (risk === "review-required") {
    return {
      action: proposal.action,
      risk,
      allowed: true,
      reason: "Allowed with review — action will be traced",
      checkedAt: now,
    };
  }

  // Auto-safe
  return {
    action: proposal.action,
    risk: "auto-safe",
    allowed: true,
    reason: "Auto-safe — read-only / analysis operation",
    checkedAt: now,
  };
}

/**
 * Check and trace a guardrail decision.
 * Use this for actions that should appear in the audit trail.
 */
export async function checkAndTrace(proposal: ActionProposal): Promise<GuardrailCheck> {
  const check = checkGuardrail(proposal);

  // Record the decision as a trace
  const trace = createTrace({
    traceType: "command",
    input: `Guardrail check: ${proposal.action}`,
  });
  trace.addToolCall({
    toolName: proposal.toolName,
    input: proposal.input,
    durationMs: 0,
    success: check.allowed,
  });
  if (!check.allowed) {
    trace.addFailure(`Guardrail blocked: ${check.reason}`);
  }
  await trace.finish();

  return check;
}
