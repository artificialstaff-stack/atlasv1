import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const storePath = path.join(
  os.tmpdir(),
  `atlas-observer-store-${process.pid}-${Date.now()}.json`,
);

function missingRelationError() {
  return {
    code: "42P01",
    message: "relation does not exist",
  };
}

function makeSelectChain() {
  const chain = {
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    order: async () => ({ data: null, error: missingRelationError() }),
    limit: async () => ({ data: null, error: missingRelationError() }),
    maybeSingle: async () => ({ data: null, error: missingRelationError() }),
    single: async () => ({ data: null, error: missingRelationError() }),
  };

  return chain;
}

vi.mock("@/lib/runtime-paths", () => ({
  resolveAtlasOutputPath: () => storePath,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: missingRelationError() }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: null, error: missingRelationError() }),
          }),
        }),
      }),
      select: () => makeSelectChain(),
    }),
  }),
}));

afterEach(async () => {
  await fs.rm(storePath, { force: true });
});

describe("customer workspace store", () => {
  it("falls back to a local request thread store when support tables are unavailable", async () => {
    const {
      createCustomerSupportThread,
      listCustomerRequestThreadsByUser,
    } = await import("@/lib/customer-workspace/store");

    const result = await createCustomerSupportThread({
      userId: "user-1",
      subject: "Katalog excel formatı",
      message: "Yarin urun excel dosyasini gonderecegim.",
    });

    expect(result.ticket.id.startsWith("local:")).toBe(true);
    expect(result.thread.subject).toBe("Katalog excel formatı");

    const threads = await listCustomerRequestThreadsByUser("user-1");
    expect(threads).toHaveLength(1);
    expect(threads[0]?.status).toBe("waiting_on_atlas");
    expect(threads[0]?.latestMessage?.body).toContain("Yarin urun excel dosyasini gonderecegim.");

    const persisted = JSON.parse(await fs.readFile(storePath, "utf8")) as {
      threads: Array<{ subject: string }>;
      messages: Array<{ body: string }>;
    };

    expect(persisted.threads[0]?.subject).toBe("Katalog excel formatı");
    expect(persisted.messages[0]?.body).toContain("Yarin urun excel dosyasini gonderecegim.");
  });
});
