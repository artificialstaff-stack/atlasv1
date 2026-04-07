import { describe, expect, it } from "vitest";
import { resolveCopilotProject } from "@/lib/admin-copilot/projects";
import { selectCopilotSkills } from "@/lib/admin-copilot/skills";

describe("admin copilot automatic context selection", () => {
  it("picks the customer workspace and default customer skills from scope", async () => {
    const scope = {
      type: "customer" as const,
      refId: "customer-123",
      label: "Yusuf Keser",
    };

    const project = await resolveCopilotProject(null, scope, "Yusuf Keser icin son formlari oku");
    const skills = await selectCopilotSkills({
      project,
      scope,
      commandText: "Yusuf Keser icin son formlari oku",
    });

    expect(project?.id).toBe("customer-workspace:customer-123");
    expect(skills.map((skill) => skill.id)).toContain("customer-intake-review");
  });

  it("routes finance prompts to the finance workspace and brief", async () => {
    const project = await resolveCopilotProject(null, { type: "global" }, "Tahsilat riski olan musterileri ozetle");
    const skills = await selectCopilotSkills({
      project,
      scope: { type: "global" },
      commandText: "Tahsilat riski olan musterileri ozetle",
    });

    expect(project?.id).toBe("finance-watch");
    expect(skills.map((skill) => skill.id)).toContain("finance-risk-brief");
  });

  it("routes research prompts to the frontier research workspace and lead skill", async () => {
    const project = await resolveCopilotProject(null, { type: "global" }, "Turkiye'den 10 uretici mail kaynagi topla");
    const skills = await selectCopilotSkills({
      project,
      scope: { type: "global" },
      commandText: "Turkiye'den 10 uretici mail kaynagi topla",
    });

    expect(project?.id).toBe("frontier-research");
    expect(skills.map((skill) => skill.id)).toContain("lead-research");
  });

  it("falls back to the operations workspace for general admin flow", async () => {
    const project = await resolveCopilotProject(null, { type: "global" }, "Bugun oncelikli operasyon blokajlarini cikar");
    const skills = await selectCopilotSkills({
      project,
      scope: { type: "global" },
      commandText: "Bugun oncelikli operasyon blokajlarini cikar",
    });

    expect(project?.id).toBe("ops-control");
    expect(skills.map((skill) => skill.id)).toContain("operations-queue-brief");
  });
});
