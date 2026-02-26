-- =============================================================================
-- Atlas Agent Action Log — AI ajan aksiyon denetim tablosu
-- Katman 11: Tüm ajan aksiyonlarını kaydeder (Audit Trail)
-- CTO Raporu Bölüm 8: Denetim & Güvenlik
-- =============================================================================

-- ─── agent_action_log tablosu ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_action_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_role    text NOT NULL CHECK (agent_role IN ('orchestrator', 'compliance', 'logistics', 'auditor')),
  action_type   text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  risk_level    smallint NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 3),
  autonomy_level smallint NOT NULL DEFAULT 0 CHECK (autonomy_level BETWEEN 0 AND 3),
  payload       jsonb DEFAULT '{}'::jsonb,
  result        jsonb,
  error_message text,
  requires_approval boolean NOT NULL DEFAULT true,
  approved_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now() NOT NULL,
  executed_at   timestamptz,
  completed_at  timestamptz
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_agent_action_log_user_id ON agent_action_log(user_id);
CREATE INDEX idx_agent_action_log_agent_role ON agent_action_log(agent_role);
CREATE INDEX idx_agent_action_log_status ON agent_action_log(status);
CREATE INDEX idx_agent_action_log_created_at ON agent_action_log(created_at DESC);
CREATE INDEX idx_agent_action_log_risk ON agent_action_log(risk_level) WHERE risk_level >= 2;

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────

ALTER TABLE agent_action_log ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi loglarını görebilir
CREATE POLICY "Users can view own action logs"
  ON agent_action_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi aksiyonlarını onaylayabilir/reddedebilir
CREATE POLICY "Users can update own pending actions"
  ON agent_action_log
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('approved', 'rejected'));

-- Service role insert (API route üzerinden)
CREATE POLICY "Service role can insert action logs"
  ON agent_action_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin (role = admin) tüm logları görebilir
CREATE POLICY "Admins can view all action logs"
  ON agent_action_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Admin aktif olmayan logları güncelleyebilir
CREATE POLICY "Admins can update any action logs"
  ON agent_action_log
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- ─── Summary View ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_agent_action_summary AS
SELECT
  user_id,
  agent_role,
  COUNT(*)                                          AS total_actions,
  COUNT(*) FILTER (WHERE status = 'executed')       AS executed_count,
  COUNT(*) FILTER (WHERE status = 'failed')         AS failed_count,
  COUNT(*) FILTER (WHERE status = 'rejected')       AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'pending')        AS pending_count,
  AVG(risk_level)::numeric(3,1)                     AS avg_risk_level,
  MAX(created_at)                                   AS last_action_at
FROM agent_action_log
GROUP BY user_id, agent_role;

-- ─── Comments ────────────────────────────────────────────────────────────────

COMMENT ON TABLE agent_action_log IS 'AI ajan aksiyonlarının denetim kaydı (audit trail)';
COMMENT ON COLUMN agent_action_log.agent_role IS 'orchestrator | compliance | logistics | auditor';
COMMENT ON COLUMN agent_action_log.risk_level IS '0=safe, 1=low, 2=medium, 3=high';
COMMENT ON COLUMN agent_action_log.autonomy_level IS '0=readonly, 1=suggest, 2=auto+notify, 3=full-auto';
