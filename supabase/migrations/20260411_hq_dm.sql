-- ============================================================
-- VELA HQ 개별 채팅 (DM) 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS hq_dm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  text TEXT NOT NULL,
  reply_to JSONB,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE hq_dm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON hq_dm FOR ALL USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_hq_dm_created ON hq_dm(created_at);
CREATE INDEX IF NOT EXISTS idx_hq_dm_pair ON hq_dm(sender, receiver);
