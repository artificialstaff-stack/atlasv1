import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  claimNextOperatorJob,
  createOperatorJob,
  extractOperatorTarget,
  listOperatorCompanions,
  listOperatorJobs,
  shouldRequireOperatorJob,
  upsertOperatorCompanionHeartbeat,
  updateOperatorJobStatus,
} from "@/lib/admin-copilot/operator-jobs";
import type { CopilotRunRecord, CopilotScope } from "@/lib/admin-copilot/types";

const ENV_KEY = "ATLAS_OPERATOR_JOB_STORE_PATH";
let tempDir: string | null = null;
const previousStorePath = process.env[ENV_KEY];
const previousStaleMinutes = process.env.ATLAS_OPERATOR_STALE_MINUTES;

function buildRun(): CopilotRunRecord {
  return {
    id: "run-1",
    sessionId: "session-1",
    requesterUserId: "admin-user",
    commandText: "/admin/customers sayfasina git ve ilk butona tikla",
    mode: "agent",
    status: "awaiting_approval",
    scopeType: "global",
    scopeRefId: null,
    summary: "Operator isi bekliyor.",
    toolName: null,
    toolInput: {},
    requiresApproval: true,
    responseText: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    metadata: {
      conversationId: "conv-1",
    },
  };
}

const scope: CopilotScope = {
  type: "global",
  refId: null,
  label: "Global",
};

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }

  if (previousStorePath) {
    process.env[ENV_KEY] = previousStorePath;
  } else {
    delete process.env[ENV_KEY];
  }

  if (previousStaleMinutes) {
    process.env.ATLAS_OPERATOR_STALE_MINUTES = previousStaleMinutes;
  } else {
    delete process.env.ATLAS_OPERATOR_STALE_MINUTES;
  }
});

describe("admin copilot operator jobs", () => {
  it("requires operator queue for interactive browser actions but not read-only inspection", () => {
    expect(shouldRequireOperatorJob("/admin/customers sayfasina git ve ilk butona tikla")).toBe(true);
    expect(shouldRequireOperatorJob("Müşteriler sayfasını aç ve ilk müşterinin detayına tıkla.")).toBe(true);
    expect(shouldRequireOperatorJob("/admin/dashboard sayfasini browser ile incele")).toBe(false);
  });

  it("extracts internal targets and persists operator jobs with allowlist metadata", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-operator-"));
    process.env[ENV_KEY] = path.join(tempDir, "jobs.json");

    expect(extractOperatorTarget("/admin/customers sayfasina git ve ilk butona tikla")).toBe("/admin/customers");
    expect(extractOperatorTarget("Müşteriler sayfasını aç ve ilk müşterinin detayına tıkla.")).toBe("/admin/customers");

    const job = await createOperatorJob({
      run: buildRun(),
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/customers sayfasina git ve ilk butona tikla",
      target: "/admin/customers",
      title: "Musteri sayfasinda operator islemi",
      description: "Ilk aksiyonu operator lane ile tamamla.",
    });

    expect(job.allowlisted).toBe(true);
    expect(job.allowlistRuleId).toBe("admin-internal");
    expect(job.status).toBe("pending");

    const jobs = await listOperatorJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(job.id);
  });

  it("updates operator job status transitions in the persistent store", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-operator-"));
    process.env[ENV_KEY] = path.join(tempDir, "jobs.json");

    const job = await createOperatorJob({
      run: buildRun(),
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/customers sayfasina git ve ilk butona tikla",
      target: "/admin/customers",
      title: "Musteri sayfasinda operator islemi",
      description: "Ilk aksiyonu operator lane ile tamamla.",
    });

    const updated = await updateOperatorJobStatus({
      jobId: job.id,
      status: "approved",
      decidedBy: "admin-user",
      decisionNote: "Devam et.",
    });

    expect(updated.status).toBe("approved");
    expect(updated.decidedBy).toBe("admin-user");

    const jobs = await listOperatorJobs();
    expect(jobs[0]?.status).toBe("approved");
    expect(jobs[0]?.decisionNote).toBe("Devam et.");
  });

  it("keeps completed jobs out of the open queue", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-operator-"));
    process.env[ENV_KEY] = path.join(tempDir, "jobs.json");

    const job = await createOperatorJob({
      run: buildRun(),
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/customers sayfasina git ve ilk butona tikla",
      target: "/admin/customers",
      title: "Musteri sayfasinda operator islemi",
      description: "Ilk aksiyonu operator lane ile tamamla.",
    });

    await updateOperatorJobStatus({
      jobId: job.id,
      status: "completed",
      decidedBy: "operator-companion",
      decisionNote: "Tamamlandi.",
    });

    const openJobs = await listOperatorJobs("open");
    expect(openJobs).toHaveLength(0);
  });

  it("lets a desktop companion heartbeat and claim the next allowlisted job", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-operator-"));
    process.env[ENV_KEY] = path.join(tempDir, "jobs.json");

    const job = await createOperatorJob({
      run: buildRun(),
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/customers sayfasina git ve ilk butona tikla",
      target: "/admin/customers",
      title: "Musteri sayfasinda operator islemi",
      description: "Ilk aksiyonu operator lane ile tamamla.",
    });

    const companion = await upsertOperatorCompanionHeartbeat({
      companionId: "desktop-companion-local",
      label: "Desktop Companion",
      platform: "win32",
      version: "0.1.0",
      capabilities: ["claim-next", "complete"],
    });

    expect(companion.status).toBe("online");

    const claimed = await claimNextOperatorJob({
      companionId: "desktop-companion-local",
      label: "Desktop Companion",
      platform: "win32",
      version: "0.1.0",
      capabilities: ["claim-next", "complete"],
    });

    expect(claimed.job?.id).toBe(job.id);
    expect(claimed.job?.status).toBe("taken_over");
    expect(claimed.job?.metadata.claimedBy).toBe("companion");
    expect(claimed.companion.claimedJobId).toBe(job.id);
    expect(claimed.companion.status).toBe("busy");

    const companions = await listOperatorCompanions();
    expect(companions[0]?.id).toBe("desktop-companion-local");
    expect(companions[0]?.status).toBe("busy");
  });

  it("closes stale open jobs before the companion claims the next fresh one", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-operator-"));
    const storePath = path.join(tempDir, "jobs.json");
    process.env[ENV_KEY] = storePath;
    process.env.ATLAS_OPERATOR_STALE_MINUTES = "15";

    const staleJob = await createOperatorJob({
      run: buildRun(),
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/customers sayfasina git ve ilk butona tikla",
      target: "/admin/customers",
      title: "Stale operator isi",
      description: "Eski kuyruk girdisi.",
    });

    await updateOperatorJobStatus({
      jobId: staleJob.id,
      status: "taken_over",
      decidedBy: "desktop-companion-local",
      decisionNote: "Eski claim.",
      metadata: {
        companionId: "desktop-companion-local",
        companionLabel: "Desktop Companion",
        claimedBy: "companion",
      },
    });

    const staleStore = JSON.parse(await readFile(storePath, "utf8")) as {
      jobs: Array<Record<string, unknown>>;
      companions: Array<Record<string, unknown>>;
    };
    staleStore.jobs = staleStore.jobs.map((job) => job.id === staleJob.id
      ? {
          ...job,
          updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        }
      : job);
    await writeFile(storePath, JSON.stringify(staleStore, null, 2), "utf8");

    const freshJob = await createOperatorJob({
      run: {
        ...buildRun(),
        id: "run-2",
        sessionId: "session-2",
        metadata: {
          conversationId: "conv-2",
        },
      },
      scope,
      requesterUserId: "admin-user",
      commandText: "/admin/forms sayfasina git ve ilk butona tikla",
      target: "/admin/forms",
      title: "Fresh operator isi",
      description: "Guncel kuyruk girdisi.",
    });

    const claimed = await claimNextOperatorJob({
      companionId: "desktop-companion-local",
      label: "Desktop Companion",
      platform: "win32",
      version: "0.1.0",
      capabilities: ["claim-next", "complete"],
    });

    expect(claimed.job?.id).toBe(freshJob.id);
    const jobs = await listOperatorJobs();
    const stale = jobs.find((job) => job.id === staleJob.id);
    expect(stale?.status).toBe("failed");
    expect(stale?.decisionNote).toBe("Stale operator işi otomatik kapatıldı.");
  });
});
