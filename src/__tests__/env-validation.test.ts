import { describe, it, expect } from "vitest";
import { z } from "zod";

// We recreate the schemas here to test them in isolation
// (the actual env.ts runs validation on import which would fail in test env)

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY gereklidir"),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  SUPABASE_WEBHOOK_SECRET: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL geçerli bir URL olmalıdır"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY gereklidir"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
});

const envSchema = serverSchema.merge(clientSchema);

describe("Environment Validation Schema", () => {
  const validEnv = {
    NODE_ENV: "production" as const,
    SUPABASE_SERVICE_ROLE_KEY: "service-key-123",
    OLLAMA_BASE_URL: "http://localhost:11434/v1",
    OLLAMA_MODEL: "llama3.1",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-456",
    NEXT_PUBLIC_APP_URL: "https://atlas.com",
  };

  it("accepts valid complete environment", () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it("accepts valid env without optional fields", () => {
    const { OLLAMA_BASE_URL, OLLAMA_MODEL, NEXT_PUBLIC_APP_URL, ...required } = validEnv;
    const result = envSchema.safeParse(required);
    expect(result.success).toBe(true);
  });

  it("defaults NODE_ENV to development", () => {
    const { NODE_ENV, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("defaults NEXT_PUBLIC_APP_URL to localhost", () => {
    const { NEXT_PUBLIC_APP_URL, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    }
  });

  it("rejects invalid NODE_ENV value", () => {
    const result = envSchema.safeParse({ ...validEnv, NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });

  it("rejects missing SUPABASE_SERVICE_ROLE_KEY", () => {
    const { SUPABASE_SERVICE_ROLE_KEY, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty SUPABASE_SERVICE_ROLE_KEY", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid SUPABASE_URL (not a URL)", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing ANON_KEY", () => {
    const { NEXT_PUBLIC_SUPABASE_ANON_KEY, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid APP_URL format", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NEXT_PUBLIC_APP_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("Client Schema (subset)", () => {
  it("accepts valid client env", () => {
    const result = clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "key-123",
    });
    expect(result.success).toBe(true);
  });

  it("does not require server-only variables", () => {
    const result = clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "key-123",
    });
    expect(result.success).toBe(true);
  });
});
