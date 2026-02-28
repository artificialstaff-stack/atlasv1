// ─── Atlas Autonomous AI — Orchestrator ─────────────────────────────────────
// The "CEO Brain" — receives a command, creates a plan, delegates to sub-agents,
// manages approval gates, and streams everything via SSE.
//
// This is the entry point for the autonomous system.
// It wraps the existing copilot pipeline for backwards compatibility.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  AutonomousCommand,
  MasterPlan,
  Phase,
  AgentTask,
  ApprovalRequest,
  ProactiveAlert,
  GeneratedContent,
  AutonomousSSEType,
} from "./types";
import { createMasterPlan } from "./planner";
import { executeSubAgent, getAgentName } from "./sub-agents";
import { createApproval, getPendingApprovals } from "./approval";
import { generateContent, scoreContentQuality } from "./content-pipeline";

type Db = SupabaseClient<Database>;

// ─── SSE Encoder ────────────────────────────────────────────────────────────

interface AutonomousSSEEvent {
  type: AutonomousSSEType;
  data: Record<string, unknown>;
  timestamp?: number;
}

function encodeSSE(event: AutonomousSSEEvent): Uint8Array {
  const encoder = new TextEncoder();
  const json = JSON.stringify({ ...event, timestamp: Date.now() });
  return encoder.encode(`data: ${json}\n\n`);
}

// ─── In-Memory State ────────────────────────────────────────────────────────

// Plan execution state (in production → Redis/Supabase)
const activePlans = new Map<string, MasterPlan>();
const planOutputs = new Map<string, Map<string, Record<string, unknown>>>();

/** Get all active plans */
export function getActivePlans(): MasterPlan[] {
  return Array.from(activePlans.values());
}

/** Get a specific plan */
export function getPlan(planId: string): MasterPlan | undefined {
  return activePlans.get(planId);
}

// ─── Dependency Resolution ──────────────────────────────────────────────────

function canExecuteTask(task: AgentTask, completedTasks: Set<string>): boolean {
  if (task.status !== "pending" && task.status !== "queued") return false;
  return task.dependencies.every(dep => completedTasks.has(dep));
}

function getExecutableTasks(phase: Phase, completedTasks: Set<string>): AgentTask[] {
  return phase.tasks.filter(t => canExecuteTask(t, completedTasks));
}

// ─── Task Executor ──────────────────────────────────────────────────────────

async function executeTask(
  task: AgentTask,
  plan: MasterPlan,
  supabase: Db,
  controller: ReadableStreamDefaultController<Uint8Array>,
  outputs: Map<string, Record<string, unknown>>,
): Promise<void> {
  task.status = "running";
  task.startedAt = Date.now();

  controller.enqueue(encodeSSE({
    type: "task_start",
    data: {
      taskId: task.id,
      phaseId: task.phaseId,
      agent: task.agent,
      agentName: getAgentName(task.agent),
      action: task.action,
      description: task.description,
    },
  }));

  try {
    // Collect inputs from dependencies
    const depOutputs: Record<string, unknown> = {};
    for (const depId of task.dependencies) {
      const depOutput = outputs.get(depId);
      if (depOutput) depOutputs[depId] = depOutput;
    }

    // Execute the sub-agent
    const result = await executeSubAgent(task, supabase, {
      planGoal: plan.goal,
      previousOutputs: depOutputs,
      command: plan.commandId,
    });

    task.output = result;
    task.status = "completed";
    task.completedAt = Date.now();
    task.durationMs = task.completedAt - (task.startedAt ?? task.completedAt);

    outputs.set(task.id, result);

    controller.enqueue(encodeSSE({
      type: "task_complete",
      data: {
        taskId: task.id,
        agent: task.agent,
        agentName: getAgentName(task.agent),
        durationMs: task.durationMs,
        outputKeys: Object.keys(result),
        summary: result.summary ?? result.text ?? "Tamamlandı",
      },
    }));

    // If content was generated, send a special event
    if (result.content) {
      controller.enqueue(encodeSSE({
        type: "content_generated",
        data: result.content as Record<string, unknown>,
      }));
    }

  } catch (err) {
    task.retries++;
    if (task.retries < task.maxRetries) {
      task.status = "pending"; // Will be retried
      controller.enqueue(encodeSSE({
        type: "task_progress",
        data: {
          taskId: task.id,
          message: `Hata oluştu, yeniden deneniyor (${task.retries}/${task.maxRetries})...`,
          retry: task.retries,
        },
      }));
    } else {
      task.status = "failed";
      task.error = err instanceof Error ? err.message : "Bilinmeyen hata";
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - (task.startedAt ?? task.completedAt);

      controller.enqueue(encodeSSE({
        type: "task_failed",
        data: {
          taskId: task.id,
          agent: task.agent,
          error: task.error,
          retries: task.retries,
        },
      }));
    }
  }
}

// ─── Phase Executor ─────────────────────────────────────────────────────────

async function executePhase(
  phase: Phase,
  plan: MasterPlan,
  supabase: Db,
  controller: ReadableStreamDefaultController<Uint8Array>,
  outputs: Map<string, Record<string, unknown>>,
): Promise<boolean> {
  phase.status = "running";

  controller.enqueue(encodeSSE({
    type: "phase_start",
    data: {
      phaseId: phase.id,
      name: phase.name,
      description: phase.description,
      taskCount: phase.tasks.length,
      gateType: phase.gateType,
    },
  }));

  const completedTasks = new Set<string>();
  let hasFailure = false;

  // Execute tasks respecting dependencies
  while (completedTasks.size < phase.tasks.length && !hasFailure) {
    const executable = getExecutableTasks(phase, completedTasks);

    if (executable.length === 0) {
      // Check if remaining tasks are all failed/cancelled
      const remaining = phase.tasks.filter(t => !completedTasks.has(t.id));
      if (remaining.every(t => t.status === "failed" || t.status === "cancelled")) {
        hasFailure = true;
        break;
      }
      // Deadlock check
      const pending = remaining.filter(t => t.status === "pending" || t.status === "queued");
      if (pending.length > 0 && executable.length === 0) {
        // Force-fail unresolvable tasks
        for (const t of pending) {
          t.status = "failed";
          t.error = "Bağımlılık çözümlenemedi (deadlock)";
          completedTasks.add(t.id);
        }
        hasFailure = true;
        break;
      }
      break;
    }

    // Execute all currently executable tasks in parallel
    await Promise.all(
      executable.map(async (task) => {
        await executeTask(task, plan, supabase, controller, outputs);
        if (task.status === "completed" || task.status === "failed") {
          completedTasks.add(task.id);
        }
        if (task.status === "failed") {
          hasFailure = true;
        }
      }),
    );
  }

  // ── Gate Check ──────────────────────────────────────────────────────
  if (phase.gateType === "approval" && !hasFailure) {
    phase.status = "awaiting_gate";

    // Collect all content generated in this phase for approval
    const phaseContent: Record<string, unknown>[] = [];
    for (const task of phase.tasks) {
      if (task.output?.content) {
        phaseContent.push(task.output.content as Record<string, unknown>);
      }
    }

    const approval = createApproval({
      type: "plan_approval",
      title: `Faz Onayı: ${phase.name}`,
      description: `"${phase.name}" fazındaki ${phase.tasks.length} görev tamamlandı. Devam etmek için onay gerekli.`,
      data: { phaseId: phase.id, planId: plan.id, contents: phaseContent },
      preview: phase.tasks.map(t => `${getAgentName(t.agent)}: ${t.description}`).join("\n"),
      requestedBy: "planner",
      urgency: "normal",
      planId: plan.id,
    });

    controller.enqueue(encodeSSE({
      type: "approval_needed",
      data: {
        approvalId: approval.id,
        type: approval.type,
        title: approval.title,
        description: approval.description,
        preview: approval.preview,
        urgency: approval.urgency,
        phaseId: phase.id,
        phaseName: phase.name,
        contents: phaseContent,
      },
    }));

    // Auto-approve for now (in production, wait for user)
    // This allows the pipeline to continue flowing
    // The UI will show the approval request and let user override
    phase.status = "completed";
  } else {
    phase.status = hasFailure ? "failed" : "completed";
  }

  controller.enqueue(encodeSSE({
    type: "phase_complete",
    data: {
      phaseId: phase.id,
      name: phase.name,
      status: phase.status,
      completedTasks: completedTasks.size,
      totalTasks: phase.tasks.length,
      hasFailure,
    },
  }));

  return !hasFailure;
}

// ─── Main Autonomous Pipeline ───────────────────────────────────────────────

/**
 * Run the full autonomous pipeline.
 *
 * Flow: Command → Plan → Phases → Tasks → Sub-Agents → Approval Gates → Summary
 *
 * Returns an SSE stream with real-time updates.
 */
export function runAutonomousPipeline(
  command: AutonomousCommand,
  supabase: Db,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const pipelineStart = Date.now();

      try {
        // ── Step 1: Create Master Plan ────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "agent_thinking",
          data: {
            agent: "planner",
            agentName: "Planlama Ajanı",
            message: "Komutu analiz ediyorum ve yürütme planı oluşturuyorum...",
          },
        }));

        const plan = await createMasterPlan(command);
        activePlans.set(plan.id, plan);

        const outputs = new Map<string, Record<string, unknown>>();
        planOutputs.set(plan.id, outputs);

        controller.enqueue(encodeSSE({
          type: "plan_created",
          data: {
            planId: plan.id,
            goal: plan.goal,
            reasoning: plan.reasoning,
            complexity: plan.complexity,
            estimatedMs: plan.estimatedMs,
            phaseCount: plan.phases.length,
            totalTasks: plan.phases.reduce((s, p) => s + p.tasks.length, 0),
            autonomyLevel: plan.autonomyLevel,
            requiresApproval: plan.requiresApproval,
            phases: plan.phases.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              taskCount: p.tasks.length,
              gateType: p.gateType,
              tasks: p.tasks.map(t => ({
                id: t.id,
                agent: t.agent,
                agentName: getAgentName(t.agent),
                action: t.action,
                description: t.description,
                dependencies: t.dependencies,
              })),
            })),
          },
        }));

        // ── Step 2: Execute Phases Sequentially ───────────────────────
        plan.status = "executing";
        let allSuccess = true;

        for (const phase of plan.phases) {
          if (!allSuccess && phase.gateType !== "auto") {
            phase.status = "skipped";
            controller.enqueue(encodeSSE({
              type: "phase_complete",
              data: { phaseId: phase.id, name: phase.name, status: "skipped" },
            }));
            continue;
          }

          controller.enqueue(encodeSSE({
            type: "agent_delegating",
            data: {
              from: "planner",
              to: phase.tasks.map(t => t.agent),
              phase: phase.name,
              message: `"${phase.name}" fazı başlatılıyor — ${phase.tasks.length} görev atanıyor...`,
            },
          }));

          const phaseSuccess = await executePhase(phase, plan, supabase, controller, outputs);
          if (!phaseSuccess) allSuccess = false;
        }

        // ── Step 3: Generate Final Summary ────────────────────────────
        controller.enqueue(encodeSSE({
          type: "agent_thinking",
          data: {
            agent: "writer",
            agentName: "Yazar Ajanı",
            message: "Tüm sonuçları derleyip özet rapor hazırlıyorum...",
          },
        }));

        const summary = buildExecutionSummary(plan, outputs);

        controller.enqueue(encodeSSE({
          type: "text",
          data: { content: summary },
        }));

        // ── Done ─────────────────────────────────────────────────────
        plan.status = allSuccess ? "completed" : "failed";
        plan.completedAt = Date.now();

        controller.enqueue(encodeSSE({
          type: "done",
          data: {
            planId: plan.id,
            status: plan.status,
            pipelineMs: Date.now() - pipelineStart,
            phaseCount: plan.phases.length,
            totalTasks: plan.phases.reduce((s, p) => s + p.tasks.length, 0),
            completedTasks: plan.phases.reduce(
              (s, p) => s + p.tasks.filter(t => t.status === "completed").length,
              0,
            ),
            failedTasks: plan.phases.reduce(
              (s, p) => s + p.tasks.filter(t => t.status === "failed").length,
              0,
            ),
            pendingApprovals: getPendingApprovals().length,
            autonomyLevel: plan.autonomyLevel,
          },
        }));

        controller.close();
      } catch (err) {
        console.error("[Atlas Autonomous] Pipeline error:", err);
        controller.enqueue(encodeSSE({
          type: "error",
          data: {
            message: err instanceof Error ? err.message : "Otonom pipeline hatası",
            code: "AUTONOMOUS_PIPELINE_ERROR",
          },
        }));
        controller.close();
      }
    },
  });
}

// ─── Summary Builder ────────────────────────────────────────────────────────

function buildExecutionSummary(
  plan: MasterPlan,
  outputs: Map<string, Record<string, unknown>>,
): string {
  const parts: string[] = [];
  parts.push(`## 🎯 Otonom Yürütme Raporu\n`);
  parts.push(`**Hedef:** ${plan.goal}`);
  parts.push(`**Karmaşıklık:** ${plan.complexity}`);
  parts.push(`**Durum:** ${plan.status === "completed" ? "✅ Başarıyla tamamlandı" : "⚠️ Kısmen tamamlandı"}\n`);

  for (const phase of plan.phases) {
    const statusIcon = phase.status === "completed" ? "✅" :
      phase.status === "failed" ? "❌" :
      phase.status === "skipped" ? "⏭️" : "⏳";

    parts.push(`### ${statusIcon} Faz ${phase.id}: ${phase.name}`);

    for (const task of phase.tasks) {
      const taskIcon = task.status === "completed" ? "✓" :
        task.status === "failed" ? "✗" : "○";
      const duration = task.durationMs ? ` (${task.durationMs}ms)` : "";
      const agentName = getAgentName(task.agent);

      parts.push(`- ${taskIcon} **${agentName}**: ${task.description}${duration}`);

      // Include task output summary if available
      const output = outputs.get(task.id);
      if (output?.summary) {
        parts.push(`  > ${output.summary}`);
      }
      if (output?.text && typeof output.text === "string") {
        // Truncate long outputs
        const text = output.text.length > 200
          ? output.text.slice(0, 200) + "..."
          : output.text;
        parts.push(`  > ${text}`);
      }
    }
    parts.push("");
  }

  // Pending approvals
  const approvals = getPendingApprovals();
  if (approvals.length > 0) {
    parts.push(`### 📋 Bekleyen Onaylar (${approvals.length})`);
    for (const a of approvals) {
      parts.push(`- **${a.title}** — ${a.description}`);
    }
    parts.push("");
  }

  const totalTasks = plan.phases.reduce((s, p) => s + p.tasks.length, 0);
  const completedTasks = plan.phases.reduce(
    (s, p) => s + p.tasks.filter(t => t.status === "completed").length,
    0,
  );
  const pipelineMs = plan.completedAt
    ? plan.completedAt - plan.createdAt
    : Date.now() - plan.createdAt;

  parts.push(`---`);
  parts.push(`**Özet:** ${completedTasks}/${totalTasks} görev tamamlandı | ${plan.phases.length} faz | ${pipelineMs}ms`);

  return parts.join("\n");
}
