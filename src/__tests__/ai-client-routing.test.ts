import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function importFreshClient() {
  vi.resetModules();
  return import("@/lib/ai/client");
}

describe("ai client routing", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("uses the extended Groq slot defaults when a Groq key is present", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_CHAT_MODEL;
    delete process.env.GROQ_FAST_MODEL;
    delete process.env.GROQ_PLANNER_MODEL;
    delete process.env.GROQ_ACTION_MODEL;
    delete process.env.GROQ_CODE_MODEL;
    delete process.env.GROQ_RESEARCH_MODEL;
    delete process.env.GROQ_RESEARCH_FAST_MODEL;
    delete process.env.GROQ_MCP_MODEL;
    delete process.env.GROQ_VISION_MODEL;

    const client = await importFreshClient();
    const info = client.getModelRoutingInfo();

    expect(info.provider).toBe("groq");
    expect(info.model).toBe("openai/gpt-oss-120b");
    expect(info.chatModel).toBe("openai/gpt-oss-20b");
    expect(info.fastModel).toBe("openai/gpt-oss-20b");
    expect(info.plannerModel).toBe("openai/gpt-oss-120b");
    expect(info.actionModel).toBe("openai/gpt-oss-120b");
    expect(info.codeModel).toBe("openai/gpt-oss-120b");
    expect(info.researchModel).toBe("groq/compound");
    expect(info.researchFastModel).toBe("groq/compound-mini");
    expect(info.mcpModel).toBe("openai/gpt-oss-120b");
    expect(info.visionModel).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
    expect(client.getModelNameForSlot("research")).toBe("groq/compound");
  });

  it("respects explicit Groq overrides for coding and MCP-heavy slots", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.GROQ_CODE_MODEL = "moonshotai/kimi-k2-instruct-0905";
    process.env.GROQ_MCP_MODEL = "qwen/qwen3-32b";

    const client = await importFreshClient();
    const info = client.getModelRoutingInfo();

    expect(info.codeModel).toBe("moonshotai/kimi-k2-instruct-0905");
    expect(info.mcpModel).toBe("qwen/qwen3-32b");
  });

  it("enables HQTT as the dedicated Jarvis lane without changing the main provider", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.ATLAS_JARVIS_ENABLED = "1";
    process.env.HQTT_BASE_URL = "http://127.0.0.1:8020/v1";
    process.env.HQTT_MODEL = "hqtt-agi-os";

    const client = await importFreshClient();

    expect(client.getModelRoutingInfo().provider).toBe("groq");
    expect(client.getJarvisRoutingInfo()).toEqual({
      provider: "hqtt",
      model: "hqtt-agi-os",
      fallbackProvider: "groq",
      fallbackModel: "groq/compound",
      hqttEnabled: true,
    });
    expect(client.getJarvisModelForSlot("research")).toBeTruthy();
  });
});
