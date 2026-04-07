import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { resolveAtlasProjectRoot } from "@/lib/runtime-paths";
import {
  getAutofixProposalById,
  getFindingById,
  getJarvisDashboard,
  saveObservationDecision,
  updateFindingStatus,
  upsertAutofixProposal,
} from "./store";
import type { AtlasAutofixProposal } from "./types";
import { getJarvisRoutingInfo } from "@/lib/ai/client";

const execFileAsync = promisify(execFile);

function nowIso() {
  return new Date().toISOString();
}

function slugifySegment(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "surface";
}

function compactSeed(seed: string) {
  const normalized = seed
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "");

  return normalized.slice(-8) || randomUUID().replace(/-/g, "").slice(0, 8);
}

export function getJarvisWorktreeRoot() {
  const configured = process.env.ATLAS_JARVIS_WORKTREE_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return path.join(homedir(), ".codex", "worktrees", "jarvis");
}

export function buildJarvisBranchName(route: string, seed: string) {
  return `codex/jarvis-${slugifySegment(route)}-${compactSeed(seed)}`;
}

export function buildJarvisWorktreePath(branchName: string, proposalId: string) {
  const branchLeaf = branchName.split("/").at(-1) ?? branchName;
  return path.join(getJarvisWorktreeRoot(), `${slugifySegment(branchLeaf)}-${proposalId.slice(-6)}`);
}

async function git(args: string[]) {
  const repoRoot = resolveAtlasProjectRoot();
  return execFileAsync("git", ["-C", repoRoot, ...args], {
    windowsHide: true,
  });
}

async function branchExists(branchName: string) {
  try {
    await git(["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

async function worktreeExists(targetPath: string) {
  try {
    const { stdout } = await git(["worktree", "list", "--porcelain"]);
    return stdout
      .split(/\r?\n/)
      .some((line) => line.startsWith("worktree ") && path.resolve(line.slice("worktree ".length)) === path.resolve(targetPath));
  } catch {
    return false;
  }
}

async function findWorktreePathForBranch(branchName: string) {
  try {
    const { stdout } = await git(["worktree", "list", "--porcelain"]);
    const lines = stdout.split(/\r?\n/);
    let currentWorktree: string | null = null;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        currentWorktree = path.resolve(line.slice("worktree ".length));
        continue;
      }

      if (line.startsWith("branch refs/heads/") && currentWorktree) {
        const currentBranch = line.slice("branch refs/heads/".length);
        if (currentBranch === branchName) {
          return currentWorktree;
        }
      }

      if (!line.trim()) {
        currentWorktree = null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function ensureWorktreeOutsideRepo(targetPath: string) {
  const repoRoot = resolveAtlasProjectRoot();
  const resolvedRepo = path.resolve(repoRoot);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedTarget.startsWith(`${resolvedRepo}${path.sep}`) || resolvedTarget === resolvedRepo) {
    throw new Error("Jarvis worktree ana repo içinde oluşturulamaz.");
  }
}

async function persistProposalMetadata(worktreePath: string, proposal: AtlasAutofixProposal) {
  await mkdir(worktreePath, { recursive: true });
  const metadataPath = path.join(worktreePath, ".jarvis-proposal.json");
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        id: proposal.id,
        findingId: proposal.findingId,
        branchName: proposal.branchName,
        targetFiles: proposal.targetFiles,
        verificationSuite: proposal.verificationSuite,
        createdAt: proposal.createdAt,
      },
      null,
      2,
    ),
    "utf8",
  );
}

export async function prepareJarvisAutofixProposal(proposalId: string) {
  const proposal = await getAutofixProposalById(proposalId);
  if (!proposal) {
    throw new Error("Jarvis proposal bulunamadı.");
  }

  const finding = await getFindingById(proposal.findingId);
  if (!finding) {
    throw new Error("Jarvis finding bulunamadı.");
  }

  if (proposal.status === "prepared" || proposal.status === "verified") {
    return proposal;
  }

  ensureWorktreeOutsideRepo(proposal.worktreePath);
  await mkdir(getJarvisWorktreeRoot(), { recursive: true });

  const hasBranch = await branchExists(proposal.branchName);
  const hasWorktree = await worktreeExists(proposal.worktreePath);
  let resolvedWorktreePath = proposal.worktreePath;

  if (!hasWorktree) {
    const existingWorktreeForBranch = hasBranch ? await findWorktreePathForBranch(proposal.branchName) : null;
    if (existingWorktreeForBranch) {
      resolvedWorktreePath = existingWorktreeForBranch;
    } else if (hasBranch) {
      await git(["worktree", "add", proposal.worktreePath, proposal.branchName]);
    } else {
      await git(["worktree", "add", "-b", proposal.branchName, proposal.worktreePath, "HEAD"]);
    }
  }

  const preparedProposal: AtlasAutofixProposal = {
    ...proposal,
    worktreePath: resolvedWorktreePath,
    status: "prepared",
    preparedAt: nowIso(),
    lastNote: finding.title,
  };

  await persistProposalMetadata(preparedProposal.worktreePath, preparedProposal);
  await upsertAutofixProposal(preparedProposal);
  await updateFindingStatus(finding.id, {
    status: "fixed_branch",
    updatedAt: nowIso(),
    summary: `${finding.summary} | Jarvis worktree hazırlandı.`,
  });
  await saveObservationDecision({
    id: `jarvis-decision-${randomUUID()}`,
    findingId: finding.id,
    actor: "jarvis",
    action: "prepared_branch",
    note: `Prepared ${preparedProposal.branchName} @ ${preparedProposal.worktreePath}`,
    createdAt: nowIso(),
  });

  return preparedProposal;
}

export async function rejectJarvisAutofixProposal(proposalId: string, note?: string | null) {
  const proposal = await getAutofixProposalById(proposalId);
  if (!proposal) {
    throw new Error("Jarvis proposal bulunamadı.");
  }

  const finding = await getFindingById(proposal.findingId);
  const rejectedProposal: AtlasAutofixProposal = {
    ...proposal,
    status: "rejected",
    rejectedAt: nowIso(),
    lastNote: note ?? "Admin tarafından reddedildi.",
  };

  await upsertAutofixProposal(rejectedProposal);
  if (finding) {
    await updateFindingStatus(finding.id, {
      status: "rejected",
      updatedAt: nowIso(),
      summary: `${finding.summary} | Proposal reddedildi.`,
    });
    await saveObservationDecision({
      id: `jarvis-decision-${randomUUID()}`,
      findingId: finding.id,
      actor: "admin",
      action: "rejected",
      note: note ?? "Proposal rejected",
      createdAt: nowIso(),
    });
  }

  return rejectedProposal;
}

export async function getJarvisDashboardWithRouting() {
  const providerInfo = getJarvisRoutingInfo();
  return getJarvisDashboard({
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  });
}
