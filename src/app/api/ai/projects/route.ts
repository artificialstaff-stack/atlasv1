import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCopilotProjects, upsertCopilotProject } from "@/lib/admin-copilot/projects";
import type { CopilotProjectContext, CopilotScope } from "@/lib/admin-copilot/types";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopeType = request.nextUrl.searchParams.get("scopeType");
  const scopeRefId = request.nextUrl.searchParams.get("scopeRefId");
  const scopeLabel = request.nextUrl.searchParams.get("scopeLabel");

  const scope: CopilotScope | undefined = scopeType
    ? {
        type: scopeType as CopilotScope["type"],
        refId: scopeRefId,
        label: scopeLabel,
      }
    : undefined;

  const projects = await getCopilotProjects(scope);

  return NextResponse.json({ projects });
}

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function slugifyId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = (body?.project ?? body ?? {}) as Partial<CopilotProjectContext>;
  const name = sanitizeString(payload.name);
  const description = sanitizeString(payload.description);
  const instructions = sanitizeString(payload.instructions);
  const scopeType = (payload.scopeType ?? "global") as CopilotScope["type"];

  if (!name || !description || !instructions) {
    return NextResponse.json({
      error: "Project için name, description ve instructions zorunludur.",
    }, { status: 400 });
  }

  const project: CopilotProjectContext = {
    id: sanitizeString(payload.id) || slugifyId(name),
    name,
    description,
    instructions,
    status: payload.status === "template" ? "template" : "active",
    scopeType,
    scopeRefId: sanitizeString(payload.scopeRefId) || null,
    defaultSkillIds: sanitizeStringArray(payload.defaultSkillIds),
  };

  const result = await upsertCopilotProject(project);

  return NextResponse.json(result, { status: 201 });
}
