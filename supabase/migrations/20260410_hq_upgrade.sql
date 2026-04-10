-- ============================================================
-- VELA HQ 기존 테이블 업그레이드 (새 컬럼 추가)
-- 이미 테이블을 생성한 경우 이 파일만 실행하면 됩니다.
-- 모든 ALTER TABLE은 ADD COLUMN IF NOT EXISTS를 사용하므로
-- 이미 컬럼이 있으면 건너뜁니다.
-- ============================================================

-- ── hq_chat: 답장 & 리액션 ─────────────────────────────
ALTER TABLE hq_chat ADD COLUMN IF NOT EXISTS reply_to JSONB;
ALTER TABLE hq_chat ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- ── hq_decisions: 상태, 영향도, 연관 목표, 투표 ────────
ALTER TABLE hq_decisions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '제안';
ALTER TABLE hq_decisions ADD COLUMN IF NOT EXISTS impact TEXT DEFAULT '중';
ALTER TABLE hq_decisions ADD COLUMN IF NOT EXISTS related_goal TEXT;
ALTER TABLE hq_decisions ADD COLUMN IF NOT EXISTS votes JSONB DEFAULT '{"up":[],"down":[]}';

-- ── hq_memos: 색상, 고정, 태그 ─────────────────────────
ALTER TABLE hq_memos ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'white';
ALTER TABLE hq_memos ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE hq_memos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ── hq_notices: 카테고리, 중요 표시 ────────────────────
ALTER TABLE hq_notices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '일반';
ALTER TABLE hq_notices ADD COLUMN IF NOT EXISTS important BOOLEAN DEFAULT false;

-- ── hq_team: 승인 여부 (이미 있을 수 있음) ─────────────
ALTER TABLE hq_team ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- ── hq_reports: 피드백 컬럼 ─────────────────────────────
ALTER TABLE hq_reports ADD COLUMN IF NOT EXISTS feedback TEXT;

-- ── hq_approvals: 긴급/승인시간 ────────────────────────
ALTER TABLE hq_approvals ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT false;
ALTER TABLE hq_approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ── hq_files: 보안 등급 (이미 있을 수 있음) ────────────
ALTER TABLE hq_files ADD COLUMN IF NOT EXISTS security TEXT DEFAULT '내부용';

-- ── 세금계산서 발행 요청 테이블 ─────────────────────────
CREATE TABLE IF NOT EXISTS tax_invoice_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  biz_no TEXT NOT NULL,
  biz_name TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_id TEXT,
  status TEXT DEFAULT '대기',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tax_invoice_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_own' AND tablename = 'tax_invoice_requests') THEN
    CREATE POLICY "auth_own" ON tax_invoice_requests FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 누락 가능한 인덱스 추가 ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hq_tasks_user ON hq_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_hq_goals_user ON hq_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_hq_events_date ON hq_events(date);
CREATE INDEX IF NOT EXISTS idx_hq_task_comments_task ON hq_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_hq_item_comments_item ON hq_item_comments(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_hq_chat_created ON hq_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_hq_notices_pinned ON hq_notices(pinned);
CREATE INDEX IF NOT EXISTS idx_hq_decisions_status ON hq_decisions(status);
CREATE INDEX IF NOT EXISTS idx_hq_memos_pinned ON hq_memos(pinned);
CREATE INDEX IF NOT EXISTS idx_hq_approvals_status ON hq_approvals(status);
CREATE INDEX IF NOT EXISTS idx_hq_directives_user ON hq_directives(user_id);
