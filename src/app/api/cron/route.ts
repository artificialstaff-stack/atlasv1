/**
 * ─── Atlas Platform — Cron Job API ───
 * Vercel Cron / manual trigger for background jobs.
 * Protected by CRON_SECRET or admin auth.
 */

import { NextResponse, type NextRequest } from "next/server";
import { runJob, runAllJobs, getRegisteredJobs, type JobName } from "@/lib/jobs";

export async function GET(request: NextRequest) {
  // Verify authorization: Vercel cron secret or admin bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobName = request.nextUrl.searchParams.get("job") as JobName | null;

  try {
    if (jobName) {
      const result = await runJob(jobName);
      return NextResponse.json(result);
    }

    // Run all jobs
    const results = await runAllJobs();
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Job execution failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Return registered jobs info
  const jobs = getRegisteredJobs().map((j) => ({
    name: j.name,
    description: j.description,
  }));
  return NextResponse.json({ jobs });
}
