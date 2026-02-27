/**
 * ─── Atlas Platform — API Versioning Service ───
 * Header-based API versioning with deprecation support.
 */

import { NextRequest, NextResponse } from "next/server";

export type APIVersion = "v1" | "v2";

export const CURRENT_API_VERSION: APIVersion = "v1";
export const SUPPORTED_VERSIONS: APIVersion[] = ["v1"];
export const DEPRECATED_VERSIONS: APIVersion[] = [];

/** Extract API version from request headers or query */
export function getAPIVersion(req: NextRequest): APIVersion {
  // 1. Check X-API-Version header
  const headerVersion = req.headers.get("x-api-version");
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as APIVersion;
  }

  // 2. Check query parameter
  const urlVersion = new URL(req.url).searchParams.get("api_version");
  if (urlVersion && isValidVersion(urlVersion)) {
    return urlVersion as APIVersion;
  }

  // 3. Default to current
  return CURRENT_API_VERSION;
}

/** Check if a version string is valid */
export function isValidVersion(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as APIVersion) ||
    DEPRECATED_VERSIONS.includes(version as APIVersion);
}

/** Check if a version is deprecated */
export function isDeprecated(version: APIVersion): boolean {
  return DEPRECATED_VERSIONS.includes(version);
}

/** Add versioning headers to response */
export function addVersionHeaders(
  response: NextResponse,
  version: APIVersion
): NextResponse {
  response.headers.set("X-API-Version", version);
  response.headers.set("X-API-Current-Version", CURRENT_API_VERSION);

  if (isDeprecated(version)) {
    response.headers.set(
      "Deprecation",
      "true"
    );
    response.headers.set(
      "Sunset",
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()
    );
    response.headers.set(
      "Link",
      `</api/${CURRENT_API_VERSION}>; rel="successor-version"`
    );
  }

  return response;
}

/** Versioned API wrapper */
export function withVersioning(
  handlers: Partial<Record<APIVersion, (req: NextRequest) => Promise<NextResponse>>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const version = getAPIVersion(req);

    if (!isValidVersion(version)) {
      return NextResponse.json(
        {
          error: "Unsupported API version",
          supported: SUPPORTED_VERSIONS,
          current: CURRENT_API_VERSION,
        },
        { status: 400 }
      );
    }

    const handler = handlers[version] ?? handlers[CURRENT_API_VERSION];
    if (!handler) {
      return NextResponse.json(
        { error: "Handler not found for this version" },
        { status: 501 }
      );
    }

    const response = await handler(req);
    return addVersionHeaders(response, version);
  };
}
