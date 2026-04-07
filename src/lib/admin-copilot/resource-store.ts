import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CopilotProjectContext, CopilotScope, CopilotSkillResource } from "./types";

type CopilotResourceStore = {
  projects: CopilotProjectContext[];
  skills: CopilotSkillResource[];
  updatedAt: string | null;
};

type PersistedProjectRow = {
  id: string;
  name: string;
  description: string;
  status: CopilotProjectContext["status"];
  scope_type: CopilotProjectContext["scopeType"];
  scope_ref_id?: string | null;
  default_skill_ids?: string[] | null;
  instructions: string;
};

type PersistedSkillRow = {
  id: string;
  name: string;
  domain: CopilotSkillResource["domain"];
  description: string;
  starter?: string | null;
  instructions: string;
  tool_hints?: string[] | null;
  enabled?: boolean | null;
};

type DbResult<T> = Promise<{
  data: T | null;
  error: unknown;
}>;

type ProjectSelectBuilder = {
  in: (column: string, values: string[]) => DbResult<PersistedProjectRow[]>;
  single: () => DbResult<PersistedProjectRow>;
};

type SkillSelectBuilder = {
  neq: (column: string, value: boolean) => DbResult<PersistedSkillRow[]>;
  single: () => DbResult<PersistedSkillRow>;
};

type ProjectTableBuilder = {
  select: (columns: string) => ProjectSelectBuilder;
  upsert: (
    row: PersistedProjectRow,
    options: { onConflict: string },
  ) => {
    select: (columns: string) => {
      single: () => DbResult<PersistedProjectRow>;
    };
  };
};

type SkillTableBuilder = {
  select: (columns: string) => SkillSelectBuilder;
  upsert: (
    row: PersistedSkillRow,
    options: { onConflict: string },
  ) => {
    select: (columns: string) => {
      single: () => DbResult<PersistedSkillRow>;
    };
  };
};

type ResourceStoreDbClient = {
  from: (table: "ai_project_contexts") => ProjectTableBuilder;
} & {
  from: (table: "ai_skill_resources") => SkillTableBuilder;
};

const EMPTY_STORE: CopilotResourceStore = {
  projects: [],
  skills: [],
  updatedAt: null,
};

function canUseSupabaseResourceStore() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();

  return candidate.code === "42P01"
    || message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find the table");
}

function getResourceStorePath() {
  return resolveAtlasOutputPath("admin-copilot", "resource-store.json");
}

async function ensureResourceStoreDir() {
  await fs.mkdir(path.dirname(getResourceStorePath()), { recursive: true });
}

async function readLocalResourceStore(): Promise<CopilotResourceStore> {
  await ensureResourceStoreDir();

  try {
    const raw = await fs.readFile(getResourceStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CopilotResourceStore>;

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...EMPTY_STORE };
    }

    return { ...EMPTY_STORE };
  }
}

async function writeLocalResourceStore(store: CopilotResourceStore) {
  await ensureResourceStoreDir();
  await fs.writeFile(getResourceStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function normalizeProjectRow(row: PersistedProjectRow): CopilotProjectContext {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    scopeType: row.scope_type,
    scopeRefId: row.scope_ref_id ?? null,
    defaultSkillIds: Array.isArray(row.default_skill_ids) ? row.default_skill_ids.filter((value): value is string => typeof value === "string") : [],
    instructions: row.instructions,
  };
}

function normalizeSkillRow(row: PersistedSkillRow): CopilotSkillResource | null {
  if (row.enabled === false) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    description: row.description,
    starter: row.starter ?? undefined,
    instructions: row.instructions,
    toolHints: Array.isArray(row.tool_hints) ? row.tool_hints.filter((value): value is string => typeof value === "string") : [],
  };
}

function projectMatchesScope(project: CopilotProjectContext, scope?: CopilotScope) {
  if (!scope) {
    return true;
  }

  if (scope.type === "global") {
    return project.scopeType === "global";
  }

  return project.scopeType === "global"
    || (project.scopeType === scope.type && project.scopeRefId === (scope.refId ?? null));
}

function sortProjectsForScope(projects: CopilotProjectContext[], scope?: CopilotScope) {
  return [...projects].sort((left, right) => {
    const leftSpecific = scope && left.scopeType !== "global" && left.scopeType === scope.type && left.scopeRefId === (scope.refId ?? null);
    const rightSpecific = scope && right.scopeType !== "global" && right.scopeType === scope.type && right.scopeRefId === (scope.refId ?? null);

    if (leftSpecific && !rightSpecific) return -1;
    if (!leftSpecific && rightSpecific) return 1;

    return left.name.localeCompare(right.name, "tr");
  });
}

function projectToRow(project: CopilotProjectContext): PersistedProjectRow {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    scope_type: project.scopeType,
    scope_ref_id: project.scopeRefId ?? null,
    default_skill_ids: project.defaultSkillIds,
    instructions: project.instructions,
  };
}

function skillToRow(skill: CopilotSkillResource): PersistedSkillRow {
  return {
    id: skill.id,
    name: skill.name,
    domain: skill.domain,
    description: skill.description,
    starter: skill.starter ?? null,
    instructions: skill.instructions,
    tool_hints: skill.toolHints,
    enabled: true,
  };
}

async function listDbProjects(scope?: CopilotScope) {
  if (!canUseSupabaseResourceStore()) {
    return null;
  }

  const client = createAdminClient() as unknown as ResourceStoreDbClient;
  const { data, error } = await client
    .from("ai_project_contexts")
    .select("id,name,description,status,scope_type,scope_ref_id,default_skill_ids,instructions")
    .in("status", ["active", "template"]);

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  const projects = ((data ?? []) as PersistedProjectRow[])
    .map(normalizeProjectRow)
    .filter((project) => projectMatchesScope(project, scope));

  return sortProjectsForScope(projects, scope);
}

async function listDbSkills() {
  if (!canUseSupabaseResourceStore()) {
    return null;
  }

  const client = createAdminClient() as unknown as ResourceStoreDbClient;
  const { data, error } = await client
    .from("ai_skill_resources")
    .select("id,name,domain,description,starter,instructions,tool_hints,enabled")
    .neq("enabled", false);

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return ((data ?? []) as PersistedSkillRow[])
    .map(normalizeSkillRow)
    .filter((skill): skill is CopilotSkillResource => Boolean(skill));
}

export async function listDynamicCopilotProjects(scope?: CopilotScope) {
  try {
    const dbProjects = await listDbProjects(scope);
    if (dbProjects) {
      return dbProjects;
    }
  } catch {
    // fall through to local store
  }

  const store = await readLocalResourceStore();
  return sortProjectsForScope(store.projects.filter((project) => projectMatchesScope(project, scope)), scope);
}

export async function listDynamicCopilotSkills() {
  try {
    const dbSkills = await listDbSkills();
    if (dbSkills) {
      return dbSkills;
    }
  } catch {
    // fall through to local store
  }

  const store = await readLocalResourceStore();
  return store.skills;
}

export async function saveDynamicCopilotProject(project: CopilotProjectContext) {
  if (canUseSupabaseResourceStore()) {
    try {
      const client = createAdminClient() as unknown as ResourceStoreDbClient;
      const { data, error } = await client
        .from("ai_project_contexts")
        .upsert(projectToRow(project), { onConflict: "id" })
        .select("id,name,description,status,scope_type,scope_ref_id,default_skill_ids,instructions")
        .single();

      if (!error && data) {
        return {
          project: normalizeProjectRow(data as PersistedProjectRow),
          persistence: "database" as const,
        };
      }

      if (error && !isMissingRelationError(error)) {
        throw error;
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error;
      }
    }
  }

  const store = await readLocalResourceStore();
  const nextProjects = store.projects.filter((entry) => entry.id !== project.id);
  nextProjects.push(project);
  await writeLocalResourceStore({
    ...store,
    projects: nextProjects,
    updatedAt: new Date().toISOString(),
  });

  return {
    project,
    persistence: "local" as const,
  };
}

export async function saveDynamicCopilotSkill(skill: CopilotSkillResource) {
  if (canUseSupabaseResourceStore()) {
    try {
      const client = createAdminClient() as unknown as ResourceStoreDbClient;
      const { data, error } = await client
        .from("ai_skill_resources")
        .upsert(skillToRow(skill), { onConflict: "id" })
        .select("id,name,domain,description,starter,instructions,tool_hints,enabled")
        .single();

      if (!error && data) {
        const normalized = normalizeSkillRow(data as PersistedSkillRow);
        if (!normalized) {
          throw new Error("Skill disabled olarak döndü.");
        }

        return {
          skill: normalized,
          persistence: "database" as const,
        };
      }

      if (error && !isMissingRelationError(error)) {
        throw error;
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error;
      }
    }
  }

  const store = await readLocalResourceStore();
  const nextSkills = store.skills.filter((entry) => entry.id !== skill.id);
  nextSkills.push(skill);
  await writeLocalResourceStore({
    ...store,
    skills: nextSkills,
    updatedAt: new Date().toISOString(),
  });

  return {
    skill,
    persistence: "local" as const,
  };
}
