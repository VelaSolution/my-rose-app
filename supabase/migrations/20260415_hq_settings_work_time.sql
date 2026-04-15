-- ============================================================
-- HQ 설정 테이블 (출근시간 등)
-- ============================================================

CREATE TABLE IF NOT EXISTS hq_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hq_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'hq_settings') THEN
    CREATE POLICY "auth_all" ON hq_settings FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 기본 출근시간 설정
INSERT INTO hq_settings (key, value) VALUES ('work_start_time', '09:00')
ON CONFLICT (key) DO NOTHING;
