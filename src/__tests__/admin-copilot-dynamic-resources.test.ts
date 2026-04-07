import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCopilotProjects, resolveCopilotProject, upsertCopilotProject } from "@/lib/admin-copilot/projects";
import { getCopilotSkills, selectCopilotSkills, upsertCopilotSkill } from "@/lib/admin-copilot/skills";

describe("admin copilot dynamic resources", () => {
  let tempRoot = "";
  let previousRoot: string | undefined;
  let previousUrl: string | undefined;
  let previousServiceRoleKey: string | undefined;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "atlas-copilot-resources-"));
    previousRoot = process.env.ATLAS_PROJECT_ROOT;
    previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.ATLAS_PROJECT_ROOT = tempRoot;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(async () => {
    if (previousRoot) {
      process.env.ATLAS_PROJECT_ROOT = previousRoot;
    } else {
      delete process.env.ATLAS_PROJECT_ROOT;
    }

    if (previousUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    if (previousServiceRoleKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("persists custom project and skill resources and feeds selection", async () => {
    await upsertCopilotSkill({
      id: "launch-qa-brief",
      name: "Launch QA Brief",
      domain: "operations",
      description: "Launch sonrası kalite kontrol adımlarını admin için özetler.",
      instructions: "Launch sonrası açık kalite risklerini ve son kontrol maddelerini sırala.",
      toolHints: ["query_database", "browser_extract_page"],
    });

    await upsertCopilotProject({
      id: "launch-quality-room",
      name: "Launch Quality Room",
      description: "Launch öncesi kalite ve operasyon doğrulama workspace'i.",
      status: "active",
      scopeType: "global",
      defaultSkillIds: ["launch-qa-brief"],
      instructions: "Launch öncesi kalite risklerini, eksik adımları ve son kontrol listesini çıkar.",
    });

    const projects = await getCopilotProjects({ type: "global" });
    const project = await resolveCopilotProject("launch-quality-room", { type: "global" }, "nötr bir admin isteği");
    const skills = await getCopilotSkills();
    const selectedSkills = await selectCopilotSkills({
      project,
      scope: { type: "global" },
      commandText: "nötr bir admin isteği",
    });

    expect(projects.map((entry) => entry.id)).toContain("launch-quality-room");
    expect(project?.defaultSkillIds).toContain("launch-qa-brief");
    expect(skills.map((entry) => entry.id)).toContain("launch-qa-brief");
    expect(selectedSkills.map((entry) => entry.id)).toContain("launch-qa-brief");
  });
});
