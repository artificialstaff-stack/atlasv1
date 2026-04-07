-- ─── Jarvis Provider Registry (DB-backed) ───
-- Stores LLM provider configurations and usage metrics.
-- Allows admin CRUD + brain preference scoring.

-- ─── Provider Configurations ───
CREATE TABLE IF NOT EXISTS jarvis_providers (
  id          TEXT PRIMARY KEY,                     -- e.g. "openai", "groq", "hqtt"
  name        TEXT NOT NULL,                        -- Human-friendly display name
  base_url    TEXT NOT NULL,                        -- OpenAI-compatible endpoint
  api_key_enc TEXT NOT NULL DEFAULT '',             -- Encrypted API key (empty for local)
  models      JSONB NOT NULL DEFAULT '{}',          -- { "primary": "gpt-4o", "fast": "gpt-4o-mini" }
  priority    INTEGER NOT NULL DEFAULT 50,          -- Lower = preferred (0 = highest)
  enabled     BOOLEAN NOT NULL DEFAULT true,
  is_hqtt     BOOLEAN NOT NULL DEFAULT false,
  rate_limits JSONB NOT NULL DEFAULT '{}',          -- { requestsPerMinute, tokensPerMinute, tokensPerDay }
  capabilities TEXT[] NOT NULL DEFAULT '{}',        -- e.g. {"vision","function_calling","streaming"}
  brain_preference_score REAL NOT NULL DEFAULT 0.5, -- 0-1, learned by brain opinions
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Provider Usage Log ───
CREATE TABLE IF NOT EXISTS jarvis_provider_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   TEXT NOT NULL REFERENCES jarvis_providers(id) ON DELETE CASCADE,
  slot          TEXT NOT NULL,                       -- model slot: "primary", "chat", "fast", etc.
  model         TEXT NOT NULL DEFAULT '',
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  success       BOOLEAN NOT NULL DEFAULT true,
  error_type    TEXT,
  http_status   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_provider_usage_provider
  ON jarvis_provider_usage(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jarvis_provider_usage_slot
  ON jarvis_provider_usage(slot);
CREATE INDEX IF NOT EXISTS idx_jarvis_provider_usage_created
  ON jarvis_provider_usage(created_at DESC);

-- ─── Extend jarvis_procedures kind for provider preferences ───
ALTER TABLE jarvis_procedures DROP CONSTRAINT IF EXISTS jarvis_procedures_kind_check;
ALTER TABLE jarvis_procedures ADD CONSTRAINT jarvis_procedures_kind_check
  CHECK (kind IN ('policy', 'playbook', 'self_heal_rule', 'benchmark_strategy', 'provider_preference'));

-- ─── RLS ───
ALTER TABLE jarvis_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_provider_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jarvis_providers_admin" ON jarvis_providers
  FOR ALL
  USING (auth.jwt()->'app_metadata'->>'user_role' IN ('super_admin', 'admin'))
  WITH CHECK (auth.jwt()->'app_metadata'->>'user_role' IN ('super_admin', 'admin'));

CREATE POLICY "jarvis_provider_usage_admin" ON jarvis_provider_usage
  FOR ALL
  USING (auth.jwt()->'app_metadata'->>'user_role' IN ('super_admin', 'admin'))
  WITH CHECK (auth.jwt()->'app_metadata'->>'user_role' IN ('super_admin', 'admin'));
