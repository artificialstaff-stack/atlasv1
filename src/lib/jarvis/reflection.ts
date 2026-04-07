/**
 * ─── Reflection Pipeline ───
 *
 * After observation findings are collected, the reflection pipeline
 * asks Jarvis (HQTT or fallback LLM) to:
 * 1. Detect patterns across findings
 * 2. Identify root causes
 * 3. Prioritize by impact × confidence × effort
 * 4. Suggest concrete actions with risk classification
 *
 * This module converts raw observation data into structured priorities
 * that the background loop and admin dashboard can act on.
 */

import { randomUUID } from "node:crypto";
import { generateText } from "ai";
import { getJarvisModelForSlot } from "@/lib/ai/client";
import { JarvisCoreAdapter } from "./core-adapter";
import { recordEpisode } from "./memory/episodic-memory";
import { runId as toRunId } from "./contracts";
import type { JarvisReflectionResult } from "./brain-types";
import type { JarvisActionRisk } from "./contracts";

// ──────────────────────────────────────
// Prompt Templates
// ──────────────────────────────────────

const REFLECTION_SYSTEM_PROMPT = `You are Jarvis, Atlas platform's self-aware AI brain.
Analyze the following observation findings and produce a structured reflection.

For each pattern you detect:
- Describe the pattern concisely
- Estimate how often it occurs (frequency)
- If possible, identify the root cause
- List the IDs of related findings

For priorities, score each finding:
- impact (0-1): How much does this affect users or the system?
- confidence (0-1): How sure are you about this assessment?
- effort (0-1): How hard is it to fix? (lower = easier)
- score = impact × confidence × (1 - effort × 0.3)
- risk: "auto-safe" | "review-required" | "operator-only" | "blocked"

Respond with valid JSON matching this schema:
{
  "patterns": [{ "pattern": string, "frequency": number, "rootCause": string | null, "relatedFindingIds": string[] }],
  "priorities": [{ "findingId": string, "impact": number, "confidence": number, "effort": number, "score": number, "suggestedAction": string, "risk": string }],
  "summary": string
}`;

// ──────────────────────────────────────
// Reflection via HQTT Brain
// ──────────────────────────────────────

async function reflectViaHqtt(findings: string[]): Promise<JarvisReflectionResult | null> {
  return JarvisCoreAdapter.reflect(findings);
}

// ──────────────────────────────────────
// Fallback: Reflection via Local LLM
// ──────────────────────────────────────

async function reflectViaLocalLlm(findings: string[]): Promise<JarvisReflectionResult | null> {
  const model = getJarvisModelForSlot("research");
  if (!model) return null;

  const findingsText = findings
    .map((f, i) => `[${i + 1}] ${f}`)
    .join("\n");

  const { text } = await generateText({
    model,
    system: REFLECTION_SYSTEM_PROMPT,
    prompt: `Findings:\n${findingsText}`,
    temperature: 0.3,
    maxOutputTokens: 2048,
  });

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      patterns?: unknown[];
      priorities?: unknown[];
      summary?: string;
    };

    const rid = toRunId(randomUUID());

    return {
      runId: rid,
      patterns: Array.isArray(parsed.patterns)
        ? (parsed.patterns as Record<string, unknown>[]).map((p) => ({
            pattern: String(p.pattern ?? ""),
            frequency: Number(p.frequency ?? 1),
            rootCause: p.rootCause ? String(p.rootCause) : undefined,
            relatedFindingIds: Array.isArray(p.relatedFindingIds)
              ? p.relatedFindingIds.map(String)
              : [],
          }))
        : [],
      priorities: Array.isArray(parsed.priorities)
        ? (parsed.priorities as Record<string, unknown>[]).map((p) => ({
            findingId: String(p.findingId ?? ""),
            impact: Number(p.impact ?? 0.5),
            confidence: Number(p.confidence ?? 0.5),
            effort: Number(p.effort ?? 0.5),
            score: Number(p.score ?? 0.5),
            suggestedAction: String(p.suggestedAction ?? ""),
            risk: (["auto-safe", "review-required", "operator-only", "blocked"].includes(
              String(p.risk),
            )
              ? String(p.risk)
              : "review-required") as JarvisActionRisk,
          }))
        : [],
      summary: String(parsed.summary ?? ""),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Run the reflection pipeline on a set of observation findings.
 * Tries HQTT brain first, falls back to local LLM.
 * Records the episode for future learning.
 */
export async function runReflection(
  findings: string[],
): Promise<JarvisReflectionResult | null> {
  if (findings.length === 0) return null;

  const start = Date.now();
  let result: JarvisReflectionResult | null = null;
  let provider: "hqtt" | "groq" | "ollama" = "groq";

  // Try HQTT brain first
  result = await reflectViaHqtt(findings);
  if (result) {
    provider = "hqtt";
  } else {
    // Fallback to local LLM  
    result = await reflectViaLocalLlm(findings);
  }

  // Record episode regardless of success
  const duration = Date.now() - start;
  recordEpisode({
    runId: result?.runId ?? toRunId(randomUUID()),
    traceType: "reflection",
    input: `Reflection on ${findings.length} findings`,
    toolCalls: [],
    approvalDecisions: [],
    artifacts: result ? [JSON.stringify(result.summary)] : [],
    failures: result ? [] : ["reflection_returned_null"],
    fallbackPath: null,
    selfReportSnapshot: null,
    provider,
    model: "",
    durationMs: duration,
  }).catch(() => {});

  return result;
}
