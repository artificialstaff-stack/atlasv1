import { z } from "zod";

/**
 * Ortam Değişkenleri Doğrulama Şeması
 *
 * Build sırasında tüm gerekli env değişkenlerinin tanımlı olduğunu garanti eder.
 * Uygulama boyunca `env` import edilerek kullanılır — `process.env` yerine.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY gereklidir"),
  // ─── Groq (Primary / Agentic) ───
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().url().optional(),
  GROQ_MODEL: z.string().optional(),
  GROQ_CHAT_MODEL: z.string().optional(),
  GROQ_FAST_MODEL: z.string().optional(),
  GROQ_PLANNER_MODEL: z.string().optional(),
  GROQ_ACTION_MODEL: z.string().optional(),
  GROQ_CODE_MODEL: z.string().optional(),
  GROQ_RESEARCH_MODEL: z.string().optional(),
  GROQ_RESEARCH_FAST_MODEL: z.string().optional(),
  GROQ_MCP_MODEL: z.string().optional(),
  GROQ_VISION_MODEL: z.string().optional(),
  // ─── Ollama (Local LLM) ───
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  OLLAMA_CHAT_MODEL: z.string().optional(),
  OLLAMA_FAST_MODEL: z.string().optional(),
  OLLAMA_PLANNER_MODEL: z.string().optional(),
  OLLAMA_ACTION_MODEL: z.string().optional(),
  OLLAMA_CODE_MODEL: z.string().optional(),
  OLLAMA_RESEARCH_MODEL: z.string().optional(),
  OLLAMA_RESEARCH_FAST_MODEL: z.string().optional(),
  OLLAMA_MCP_MODEL: z.string().optional(),
  OLLAMA_VISION_MODEL: z.string().optional(),
  HQTT_BASE_URL: z.string().url().optional(),
  HQTT_API_KEY: z.string().optional(),
  HQTT_MODEL: z.string().optional(),
  ATLAS_JARVIS_ENABLED: z.enum(["0", "1"]).optional(),
  ATLAS_OBSERVER_ENABLED: z.enum(["0", "1"]).optional(),
  SUPABASE_WEBHOOK_SECRET: z.string().optional(),
  // ─── Email ───
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  // ─── Monitoring ───
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL geçerli bir URL olmalıdır"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY gereklidir"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  // ─── Analytics ───
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

const envSchema = serverSchema.merge(clientSchema);

function validateEnv() {
  // Client tarafında çalışırken sadece public değişkenleri kontrol et
  if (typeof window !== "undefined") {
    const clientResult = clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });

    if (!clientResult.success) {
      console.error("❌ Geçersiz client ortam değişkenleri:", clientResult.error.flatten().fieldErrors);
      throw new Error("Client ortam değişkenleri eksik veya geçersiz");
    }

    return clientResult.data as z.infer<typeof envSchema>;
  }

  // Server tarafında tüm değişkenleri kontrol et
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_BASE_URL: process.env.GROQ_BASE_URL,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GROQ_CHAT_MODEL: process.env.GROQ_CHAT_MODEL,
    GROQ_FAST_MODEL: process.env.GROQ_FAST_MODEL,
    GROQ_PLANNER_MODEL: process.env.GROQ_PLANNER_MODEL,
    GROQ_ACTION_MODEL: process.env.GROQ_ACTION_MODEL,
    GROQ_CODE_MODEL: process.env.GROQ_CODE_MODEL,
    GROQ_RESEARCH_MODEL: process.env.GROQ_RESEARCH_MODEL,
    GROQ_RESEARCH_FAST_MODEL: process.env.GROQ_RESEARCH_FAST_MODEL,
    GROQ_MCP_MODEL: process.env.GROQ_MCP_MODEL,
    GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL,
    OLLAMA_FAST_MODEL: process.env.OLLAMA_FAST_MODEL,
    OLLAMA_PLANNER_MODEL: process.env.OLLAMA_PLANNER_MODEL,
    OLLAMA_ACTION_MODEL: process.env.OLLAMA_ACTION_MODEL,
    OLLAMA_CODE_MODEL: process.env.OLLAMA_CODE_MODEL,
    OLLAMA_RESEARCH_MODEL: process.env.OLLAMA_RESEARCH_MODEL,
    OLLAMA_RESEARCH_FAST_MODEL: process.env.OLLAMA_RESEARCH_FAST_MODEL,
    OLLAMA_MCP_MODEL: process.env.OLLAMA_MCP_MODEL,
    OLLAMA_VISION_MODEL: process.env.OLLAMA_VISION_MODEL,
    HQTT_BASE_URL: process.env.HQTT_BASE_URL,
    HQTT_API_KEY: process.env.HQTT_API_KEY,
    HQTT_MODEL: process.env.HQTT_MODEL,
    ATLAS_JARVIS_ENABLED: process.env.ATLAS_JARVIS_ENABLED,
    ATLAS_OBSERVER_ENABLED: process.env.ATLAS_OBSERVER_ENABLED,
    SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });

  if (!result.success) {
    console.error("❌ Geçersiz ortam değişkenleri:", result.error.flatten().fieldErrors);
    throw new Error("Ortam değişkenleri eksik veya geçersiz. Detaylar için konsolu kontrol edin.");
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
