import { describe, expect, it } from "vitest";
import { getUnifiedToolRegistry, getUnifiedToolRegistrySummary } from "@/lib/ai/orchestrator/registry";

describe("ai orchestrator registry", () => {
  it("builds a canonical registry summary from sdk and agent tools", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://atlas.test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key";
    const tools = getUnifiedToolRegistry();
    const summary = getUnifiedToolRegistrySummary(tools);

    expect(tools.length).toBeGreaterThan(150);
    expect(summary.total).toBe(tools.length);
    expect(summary.sources.sdk).toBeGreaterThan(100);
    expect(summary.sources.agent).toBeGreaterThan(10);
    expect(summary.readOnly).toBeGreaterThan(0);
    expect(summary.browserTools).toBeGreaterThan(0);
    expect(summary.healthy).toBeGreaterThan(0);
    expect(summary.selectable).toBeGreaterThan(0);
    expect(summary.pruned).toBeGreaterThanOrEqual(0);
    expect(summary.selectable + summary.pruned).toBe(summary.total);
    expect(summary.domains.operations).toBeGreaterThan(0);
    expect(summary.domains.research).toBeGreaterThan(0);
  });
});
