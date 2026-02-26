-- Atlas Platform — State Machine Status Migration
-- CTO Raporu Bölüm 10 / Adım 40: process_tasks için state_machine_status ENUM
--
-- Bu migration, process_tasks tablosuna state_machine_status sütunu ekler.
-- Finite State Machine (FSM) ile görev durumlarının daha hassas kontrolünü sağlar.
--
-- Durumlar:
--   idle         → Görev oluşturulmuş, henüz başlamamış
--   awaiting_input → Kullanıcıdan bilgi/belge bekleniyor
--   processing   → Atlas tarafından işleniyor
--   review       → Kullanıcı veya admin incelemesi bekleniyor
--   approved     → Onaylanmış, bir sonraki adıma geçilebilir
--   rejected     → Reddedilmiş, düzeltme gerekiyor
--   completed    → Tamamlanmış
--   failed       → Hata ile sonuçlanmış

-- 1. ENUM türü oluştur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'state_machine_status') THEN
    CREATE TYPE state_machine_status AS ENUM (
      'idle',
      'awaiting_input',
      'processing',
      'review',
      'approved',
      'rejected',
      'completed',
      'failed'
    );
  END IF;
END
$$;

-- 2. Sütun ekle (varsa atla)
ALTER TABLE process_tasks
  ADD COLUMN IF NOT EXISTS sm_status state_machine_status DEFAULT 'idle';

-- 3. Mevcut task_status değerlerinden mapped et
UPDATE process_tasks SET sm_status = CASE
  WHEN task_status = 'pending'     THEN 'idle'::state_machine_status
  WHEN task_status = 'in_progress' THEN 'processing'::state_machine_status
  WHEN task_status = 'completed'   THEN 'completed'::state_machine_status
  WHEN task_status = 'blocked'     THEN 'awaiting_input'::state_machine_status
  ELSE 'idle'::state_machine_status
END
WHERE sm_status = 'idle' AND task_status IS NOT NULL AND task_status != 'pending';

-- 4. Geçiş log tablosu (FSM geçmiş kaydı)
CREATE TABLE IF NOT EXISTS state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES process_tasks(id) ON DELETE CASCADE,
  from_state state_machine_status NOT NULL,
  to_state state_machine_status NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'system', -- 'user', 'agent', 'system'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Geçiş log'u için index
CREATE INDEX IF NOT EXISTS idx_state_transitions_task_id
  ON state_transitions(task_id);

CREATE INDEX IF NOT EXISTS idx_state_transitions_created_at
  ON state_transitions(created_at);

-- 6. RLS politikaları
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi görevlerinin geçişlerini görebilir
CREATE POLICY "Users can view own task transitions"
  ON state_transitions FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM process_tasks WHERE user_id = auth.uid()
    )
  );

-- Admin'ler tüm geçişleri görebilir
CREATE POLICY "Admins can view all transitions"
  ON state_transitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
