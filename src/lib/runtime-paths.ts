import path from "node:path";
import process from "node:process";

function isProjectRoot(candidate: string) {
  const normalized = candidate.replace(/\\/g, "/");
  return normalized.endsWith("/atlas-platform") || normalized.endsWith("/atlas-platform/atlas-platform");
}

export function resolveAtlasProjectRoot() {
  const configuredRoot = process.env.ATLAS_PROJECT_ROOT?.trim();
  if (configuredRoot) {
    return path.resolve(configuredRoot);
  }

  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (isProjectRoot(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return process.cwd();
}

export function resolveAtlasOutputPath(...segments: string[]) {
  return path.resolve(resolveAtlasProjectRoot(), "output", ...segments);
}
