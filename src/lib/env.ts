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
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY gereklidir").optional(),
  SUPABASE_WEBHOOK_SECRET: z.string().optional(),
  // ─── Payments ───
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  // ─── Email ───
  RESEND_API_KEY: z.string().optional(),
  // ─── Monitoring ───
  SENTRY_DSN: z.string().url().optional(),
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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
    STRIPE_PRICE_PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL,
    STRIPE_PRICE_ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
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
