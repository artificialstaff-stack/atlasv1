import { NextResponse } from "next/server";

/**
 * Stub route — the original CopilotKit runtime was removed in the Jarvis migration.
 * This route exists only because Next.js generates a validator reference for it
 * during build. Returning 410 Gone signals to any remaining callers that this
 * endpoint is permanently retired.
 */

export function GET() {
  return NextResponse.json(
    { status: "gone", message: "CopilotKit runtime removed — use /api/admin/copilot/jarvis instead" },
    { status: 410 },
  );
}

export function POST() {
  return NextResponse.json(
    { status: "gone", message: "CopilotKit runtime removed — use /api/admin/copilot/jarvis instead" },
    { status: 410 },
  );
}
