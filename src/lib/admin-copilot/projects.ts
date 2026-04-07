import { listDynamicCopilotProjects, saveDynamicCopilotProject } from "./resource-store";
import type { CopilotProjectContext, CopilotScope } from "./types";

const GLOBAL_PROJECTS: CopilotProjectContext[] = [
  {
    id: "ops-control",
    name: "Ops Control",
    description: "Global operasyon kuyruğu, approval ve risk görünümü.",
    status: "active",
    scopeType: "global",
    defaultSkillIds: ["operations-queue-brief", "finance-risk-brief"],
    instructions:
      "Global operasyon bağlamında açık queue, approval ve riskleri hızlıca özetle.",
  },
  {
    id: "frontier-research",
    name: "Frontier Research",
    description: "Benchmark, araştırma ve artifacts için deneysel çalışma alanı.",
    status: "active",
    scopeType: "global",
    defaultSkillIds: ["frontier-benchmark-audit", "lead-research"],
    instructions:
      "Araştırma ve benchmark görevlerinde history, zayıf alanlar ve yeni artifact üretimini önceliklendir.",
  },
  {
    id: "finance-watch",
    name: "Finance Watch",
    description: "Tahsilat, invoice ve finansal blokaj takibi.",
    status: "active",
    scopeType: "global",
    defaultSkillIds: ["finance-risk-brief"],
    instructions:
      "Finans risklerinde müşteri bazlı kısa risk özeti ve önerilen aksiyon üret.",
  },
];

export function getBuiltInCopilotProjects(scope?: CopilotScope) {
  const projects = [...GLOBAL_PROJECTS];

  if (scope?.type === "customer" && scope.refId) {
    projects.unshift({
      id: `customer-workspace:${scope.refId}`,
      name: `${scope.label ?? "Müşteri"} Launch Workspace`,
      description: "Seçili müşteri için intake, launch ve paket aktivasyon alanı.",
      status: "active",
      scopeType: "customer",
      scopeRefId: scope.refId,
      defaultSkillIds: ["customer-intake-review", "marketplace-launch-readiness"],
      instructions:
        "Seçili müşteri için intake, launch readiness, paket aktivasyonu ve admin tarafında atılacak sonraki aksiyonları birlikte değerlendir.",
    });
  }

  return projects;
}

function mergeProjects(
  baseProjects: CopilotProjectContext[],
  dynamicProjects: CopilotProjectContext[],
  scope?: CopilotScope,
) {
  const byId = new Map<string, CopilotProjectContext>();

  for (const project of baseProjects) {
    byId.set(project.id, project);
  }

  for (const project of dynamicProjects) {
    byId.set(project.id, project);
  }

  const merged = Array.from(byId.values());

  return merged.sort((left, right) => {
    const leftSpecific = scope && left.scopeType !== "global" && left.scopeType === scope.type && left.scopeRefId === (scope.refId ?? null);
    const rightSpecific = scope && right.scopeType !== "global" && right.scopeType === scope.type && right.scopeRefId === (scope.refId ?? null);

    if (leftSpecific && !rightSpecific) return -1;
    if (!leftSpecific && rightSpecific) return 1;

    return left.name.localeCompare(right.name, "tr");
  });
}

export async function getCopilotProjects(scope?: CopilotScope) {
  const baseProjects = getBuiltInCopilotProjects(scope);
  const dynamicProjects = await listDynamicCopilotProjects(scope);
  return mergeProjects(baseProjects, dynamicProjects, scope);
}

function normalizeProjectCommandText(commandText: string | null | undefined) {
  return (commandText ?? "").toLowerCase();
}

function inferGlobalProjectId(commandText: string | null | undefined) {
  const normalized = normalizeProjectCommandText(commandText);

  if (/(fatura|invoice|finans|tahsilat|odeme|ödeme|borc|borç|risk)/i.test(normalized)) {
    return "finance-watch";
  }

  if (/(benchmark|frontier|arastirma|araştırma|lead|mail|email|uretici|üretici|tedarikci|tedarikçi|kaynak|web)/i.test(normalized)) {
    return "frontier-research";
  }

  return "ops-control";
}

export async function selectCopilotProject(commandText: string | null | undefined, scope?: CopilotScope) {
  const projects = await getCopilotProjects(scope);

  if (scope?.type === "customer" && scope.refId) {
    return projects.find((project) => project.id === `customer-workspace:${scope.refId}`) ?? projects[0] ?? null;
  }

  const inferredProjectId = inferGlobalProjectId(commandText);
  return projects.find((project) => project.id === inferredProjectId) ?? projects[0] ?? null;
}

export async function resolveCopilotProject(
  projectId: string | null | undefined,
  scope?: CopilotScope,
  commandText?: string | null,
) {
  const projects = await getCopilotProjects(scope);

  if (projectId) {
    return projects.find((project) => project.id === projectId) ?? null;
  }

  if (scope?.type === "customer" && scope.refId) {
    return projects.find((project) => project.id === `customer-workspace:${scope.refId}`) ?? projects[0] ?? null;
  }

  const inferredProjectId = inferGlobalProjectId(commandText);
  return projects.find((project) => project.id === inferredProjectId) ?? projects[0] ?? null;
}

export async function upsertCopilotProject(project: CopilotProjectContext) {
  return saveDynamicCopilotProject(project);
}
