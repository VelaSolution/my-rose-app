-- ============================================================
-- VELA HQ 전체 테이블 (기존 + 하이윅스 확장) — 한번에 실행
-- ============================================================

-- ── 기존 HQ 코어 ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS hq_mett (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission TEXT NOT NULL,
  enemy TEXT,
  terrain TEXT,
  troops TEXT,
  time_constraint TEXT,
  civil TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS hq_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  revenue BIGINT DEFAULT 0,
  users_count INT DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  profit BIGINT DEFAULT 0,
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS hq_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  metric_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS hq_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES hq_goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assignee TEXT,
  deadline DATE,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS hq_aar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  goal TEXT NOT NULL,
  result TEXT NOT NULL,
  gap_reason TEXT,
  improvement TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── HQ 협업 테이블 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS hq_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  read_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT '중간',
  status TEXT DEFAULT '신규',
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_team (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  hq_role TEXT DEFAULT '팀원',
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  decision TEXT,
  reason TEXT,
  owner TEXT,
  follow_up TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT NOT NULL,
  approver TEXT,
  status TEXT DEFAULT '대기',
  comment TEXT,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  problems TEXT,
  next_steps TEXT,
  description TEXT,
  priority TEXT,
  progress NUMERIC,
  deadline TEXT,
  status TEXT DEFAULT 'draft',
  approver TEXT,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES hq_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  type TEXT,
  url TEXT NOT NULL,
  r2_key TEXT,
  security TEXT DEFAULT '내부용',
  folder_id UUID REFERENCES hq_folders(id) ON DELETE SET NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 태스크 댓글 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES hq_tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 대시보드 지시사항/댓글 ──────────────────────────────
CREATE TABLE IF NOT EXISTS hq_directives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_item_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 일정/캘린더 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  color TEXT DEFAULT 'blue',
  author TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 하이윅스 신규 테이블 ───────────────────────────────

CREATE TABLE IF NOT EXISTS hq_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT DEFAULT '정상',
  overtime NUMERIC DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS hq_leave (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '연차',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT '대기',
  approver TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  extension TEXT,
  profile_img TEXT,
  manager TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_board (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '자유',
  title TEXT NOT NULL,
  content TEXT,
  author TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_board_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES hq_board(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author TEXT NOT NULL,
  deadline DATE,
  status TEXT DEFAULT '진행중',
  questions JSONB DEFAULT '[]',
  responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hq_survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES hq_surveys(id) ON DELETE CASCADE,
  respondent TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(survey_id, respondent)
);

CREATE TABLE IF NOT EXISTS hq_wiki (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT '일반',
  author TEXT NOT NULL,
  last_editor TEXT,
  tags TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS 활성화 ──────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE hq_mett ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_metrics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_goals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_aar ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_notices ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_feedback ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_memos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_team ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_chat ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_decisions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_approvals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_folders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_files ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_task_comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_directives ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_item_comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_attendance ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_leave ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_contacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_board ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_board_comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_surveys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_survey_responses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hq_wiki ENABLE ROW LEVEL SECURITY;
END $$;

-- ── RLS 정책 ────────────────────────────────────────────
-- 코어 테이블: 본인 데이터만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_mett' AND tablename = 'hq_mett') THEN
    CREATE POLICY "own_mett" ON hq_mett FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_metrics' AND tablename = 'hq_metrics') THEN
    CREATE POLICY "own_metrics" ON hq_metrics FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_goals' AND tablename = 'hq_goals') THEN
    CREATE POLICY "own_goals" ON hq_goals FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_tasks' AND tablename = 'hq_tasks') THEN
    CREATE POLICY "own_tasks" ON hq_tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_aar' AND tablename = 'hq_aar') THEN
    CREATE POLICY "own_aar" ON hq_aar FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 협업/하이윅스 테이블: 로그인 사용자 전체 접근
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hq_task_comments','hq_directives','hq_item_comments','hq_events','hq_notices','hq_feedback','hq_memos','hq_team','hq_chat',
    'hq_decisions','hq_approvals','hq_reports','hq_folders','hq_files',
    'hq_attendance','hq_leave','hq_contacts','hq_board','hq_board_comments',
    'hq_surveys','hq_survey_responses','hq_wiki'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY "auth_all" ON %I FOR ALL USING (auth.uid() IS NOT NULL)', tbl);
    END IF;
  END LOOP;
END $$;

-- ── 인덱스 ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hq_attendance_user_date ON hq_attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_hq_leave_requester ON hq_leave(requester);
CREATE INDEX IF NOT EXISTS idx_hq_board_category ON hq_board(category);
CREATE INDEX IF NOT EXISTS idx_hq_board_comments_post ON hq_board_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_hq_survey_responses_survey ON hq_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_hq_wiki_category ON hq_wiki(category);
