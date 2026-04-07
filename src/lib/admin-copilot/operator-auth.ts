function getConfiguredOperatorCompanionToken() {
  const configuredToken = process.env.ATLAS_OPERATOR_COMPANION_TOKEN?.trim();
  if (configuredToken) {
    return configuredToken;
  }

  return process.env.ATLAS_DEV_TOKEN?.trim() ?? null;
}

export function hasOperatorCompanionAccess(request: Request) {
  const configuredToken = getConfiguredOperatorCompanionToken();
  if (!configuredToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const directToken = request.headers.get("x-atlas-operator-token")?.trim();

  return bearerToken === configuredToken || directToken === configuredToken;
}

export function getOperatorCompanionIdentity(request: Request) {
  if (!hasOperatorCompanionAccess(request)) {
    return null;
  }

  const id = request.headers.get("x-atlas-operator-id")?.trim() || "operator-companion";
  const label = request.headers.get("x-atlas-operator-label")?.trim() || id;

  return {
    id,
    label,
  };
}
