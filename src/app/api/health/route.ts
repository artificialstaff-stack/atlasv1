import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      service: "atlas-platform",
    },
    { status: 200 }
  );
}
