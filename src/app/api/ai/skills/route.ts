import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCopilotSkills, upsertCopilotSkill } from "@/lib/admin-copilot/skills";
import type { CopilotSkillResource } from "@/lib/admin-copilot/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skills = await getCopilotSkills();

  return NextResponse.json({
    skills,
  });
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

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = (body?.skill ?? body ?? {}) as Partial<CopilotSkillResource>;
  const name = sanitizeString(payload.name);
  const description = sanitizeString(payload.description);
  const instructions = sanitizeString(payload.instructions);
  const domain = payload.domain ?? "global";

  if (!name || !description || !instructions) {
    return NextResponse.json({
      error: "Skill için name, description ve instructions zorunludur.",
    }, { status: 400 });
  }

  const skill: CopilotSkillResource = {
    id: sanitizeString(payload.id) || slugifyId(name),
    name,
    description,
    instructions,
    domain,
    starter: sanitizeString(payload.starter) || undefined,
    toolHints: sanitizeStringArray(payload.toolHints),
  };

  const result = await upsertCopilotSkill(skill);

  return NextResponse.json(result, { status: 201 });
}
