-- HQ 인트라넷 전체 테이블 (localStorage → Supabase 전환)

-- 공지사항
CREATE TABLE IF NOT EXISTS hq_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  read_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 피드백/버그
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

-- 메모
CREATE TABLE IF NOT EXISTS hq_memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 팀 멤버
CREATE TABLE IF NOT EXISTS hq_team (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  hq_role TEXT DEFAULT '팀원',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 채팅
CREATE TABLE IF NOT EXISTS hq_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 의사결정
CREATE TABLE IF NOT EXISTS hq_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  decision TEXT,
  reason TEXT,
  owner TEXT,
  follow_up TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 결재
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

-- 보고서
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

-- 폴더
CREATE TABLE IF NOT EXISTS hq_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES hq_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 파일 메타데이터 (Storage와 연동)
CREATE TABLE IF NOT EXISTS hq_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  type TEXT,
  url TEXT NOT NULL,
  folder_id UUID REFERENCES hq_folders(id) ON DELETE SET NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
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

-- 모든 로그인 사용자 접근 (HQ 페이지 자체에서 권한 체크)
CREATE POLICY "auth_all" ON hq_notices FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_feedback FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_memos FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_team FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_chat FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_decisions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_approvals FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_reports FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_folders FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON hq_files FOR ALL USING (auth.uid() IS NOT NULL);
