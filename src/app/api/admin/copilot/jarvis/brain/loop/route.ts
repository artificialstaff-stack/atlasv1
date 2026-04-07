import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  startBackgroundLoop,
  stopBackgroundLoop,
  getBackgroundLoopState,
} from "@/lib/jarvis";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getBackgroundLoopState();
  return NextResponse.json({ state });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action;

    if (action === "start") {
      const started = await startBackgroundLoop();
      return NextResponse.json({
        success: started,
        message: started ? "Background loop started" : "Already running or locked by another instance",
        state: await getBackgroundLoopState(),
      });
    }

    if (action === "stop") {
      const stopped = await stopBackgroundLoop();
      return NextResponse.json({
        success: stopped,
        message: stopped ? "Background loop stopping" : "Not running",
        state: await getBackgroundLoopState(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop".' },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Background loop işlemi başarısız." },
      { status: 500 },
    );
  }
}
