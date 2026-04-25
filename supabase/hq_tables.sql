-- ============================================================
-- VELA HQ 테이블 생성 SQL
-- 생성일: 2026-04-14
-- 설명: app/hq 코드에서 사용하는 모든 Supabase 테이블
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. hq_team (팀원 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_team (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,                          -- 이름
  role       text DEFAULT '',                        -- 직무/역할
  email      text DEFAULT '',                        -- 이메일
  status     text DEFAULT 'offline',                 -- active | away | offline
  hq_role    text DEFAULT '팀원',                    -- 대표 | 이사 | 팀장 | 팀원
  approved   boolean DEFAULT false,                  -- 가입 승인 여부
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_team_auth" ON hq_team
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 2. hq_attendance (근태 관리)
--    upsert 시 user_id + date 로 충돌 처리
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_attendance (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL,                          -- auth.users.id
  user_name  text NOT NULL,                          -- 표시 이름
  date       text NOT NULL,                          -- YYYY-MM-DD
  clock_in   timestamptz,                            -- 출근 시각
  clock_out  timestamptz,                            -- 퇴근 시각
  status     text DEFAULT '정상',                    -- 정상 | 지각 | 조퇴 | 결근 | 휴가 | 출장
  overtime   numeric DEFAULT 0,                      -- 초과근무 시간
  memo       text,                                   -- 메모
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)                             -- upsert onConflict 용
);

ALTER TABLE hq_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_attendance_auth" ON hq_attendance
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 3. hq_leave (휴가 신청)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_leave (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester  text NOT NULL,                          -- 신청자 이름
  type       text NOT NULL,                          -- 연차 | 반차(오전) | 반차(오후) | 병가 | 경조 | 출장 | 기타
  start_date text NOT NULL,                          -- YYYY-MM-DD
  end_date   text NOT NULL,                          -- YYYY-MM-DD
  days       numeric DEFAULT 0,                      -- 사용 일수
  reason     text DEFAULT '',                        -- 사유
  status     text DEFAULT '대기',                    -- 대기 | 승인 | 반려
  approver   text,                                   -- 결재자 이름
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_leave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_leave_auth" ON hq_leave
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 4. hq_mett (상황판단 METT-TC)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_mett (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL,
  mission         text DEFAULT '',
  enemy           text DEFAULT '',
  terrain         text DEFAULT '',
  troops          text DEFAULT '',
  time_constraint text DEFAULT '',
  civil           text DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE hq_mett ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_mett_auth" ON hq_mett
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 5. hq_metrics (KPI 지표)
--    upsert 시 user_id + date 로 충돌 처리
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_metrics (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL,
  date            text NOT NULL,                     -- YYYY-MM-DD
  revenue         numeric DEFAULT 0,                 -- 매출
  users_count     integer DEFAULT 0,                 -- 사용자 수
  conversion_rate numeric DEFAULT 0,                 -- 전환율
  profit          numeric DEFAULT 0,                 -- 이익
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE hq_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_metrics_auth" ON hq_metrics
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 6. hq_goals (목표 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_goals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL,
  title         text NOT NULL,
  target_value  numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  metric_type   text DEFAULT '기타',
  start_date    text,                                -- YYYY-MM-DD
  end_date      text,                                -- YYYY-MM-DD
  status        text DEFAULT 'active',               -- active | completed | failed
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE hq_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_goals_auth" ON hq_goals
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 7. hq_tasks (태스크)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_tasks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  assignee   text DEFAULT '',                        -- 담당자 이름
  deadline   text,                                   -- YYYY-MM-DD
  goal_id    uuid,                                   -- hq_goals.id (nullable)
  status     text DEFAULT 'pending',                 -- pending | in_progress | review | completed
  result     text,                                   -- JSON 문자열 (priority, progress 등)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_tasks_auth" ON hq_tasks
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 8. hq_task_comments (태스크 댓글)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_task_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    uuid NOT NULL,                          -- hq_tasks.id
  author     text NOT NULL,
  text       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_task_comments_auth" ON hq_task_comments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 9. hq_aar (After Action Review)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_aar (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL,
  date        text NOT NULL,                         -- YYYY-MM-DD
  goal        text DEFAULT '',
  result      text DEFAULT '',
  gap_reason  text DEFAULT '',
  improvement text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_aar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_aar_auth" ON hq_aar
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 10. hq_notices (공지사항)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_notices (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  content    text DEFAULT '',
  pinned     boolean DEFAULT false,
  important  boolean DEFAULT false,                  -- 중요 공지 여부
  category   text DEFAULT '일반',                    -- 일반 | 긴급 | 인사 | 경영
  author     text DEFAULT '',
  read_by    jsonb DEFAULT '[]'::jsonb,              -- 읽은 사람 목록 (문자열 배열)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_notices_auth" ON hq_notices
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 11. hq_reports (보고서 - daily/issue/project 공용)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type text NOT NULL,                         -- daily | issue | project
  title       text,                                  -- issue/project 용
  content     text,                                  -- daily 용
  description text,                                  -- issue/project 용
  problems    text,                                  -- daily 용
  next_steps  text,                                  -- daily 용
  priority    text,                                  -- issue 용
  progress    numeric,                               -- project 용 (0~100)
  deadline    text,                                  -- project 용 YYYY-MM-DD
  status      text DEFAULT 'submitted',              -- draft | submitted | approved | rejected
  approver    text,                                  -- 결재자
  author      text NOT NULL,                         -- 작성자
  feedback    text,                                  -- 결재자 피드백
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_reports_auth" ON hq_reports
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 12. hq_feedback (피드백/버그 리포트)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_feedback (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text DEFAULT '버그',                   -- 버그 | 기능요청 | 개선 | 기타
  title       text NOT NULL,
  description text DEFAULT '',
  priority    text DEFAULT '중간',                   -- 높음 | 중간 | 낮음
  status      text DEFAULT '신규',                   -- 신규 | 진행 | 완료
  author      text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_feedback_auth" ON hq_feedback
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 13. hq_item_comments (범용 댓글 - feedback, report, dashboard)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_item_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id    uuid NOT NULL,                          -- 대상 아이템 ID
  item_type  text NOT NULL,                          -- feedback | report | dashboard
  author     text NOT NULL,
  text       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_item_comments_auth" ON hq_item_comments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 14. hq_approvals (결재)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_approvals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  content     text DEFAULT '',
  author      text NOT NULL,                         -- 보고자
  approver    text NOT NULL,                         -- 결재자
  status      text DEFAULT '대기',                   -- 대기 | 승인 | 반려
  comment     text,                                  -- 결재자 코멘트
  file_url    text,                                  -- 첨부파일 URL
  file_name   text,                                  -- 첨부파일명
  urgent      boolean DEFAULT false,                 -- 긴급 결재
  approved_at timestamptz,                           -- 승인/반려 시각
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_approvals_auth" ON hq_approvals
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 15. hq_decisions (의사결정)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_decisions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  decision     text NOT NULL,                        -- 결정사항
  reason       text DEFAULT '',                      -- 근거/이유
  owner        text DEFAULT '',                      -- 책임자
  follow_up    text DEFAULT '',                      -- 후속 조치
  impact       text DEFAULT '중',                    -- 상 | 중 | 하
  related_goal text DEFAULT '',                      -- 관련 목표
  status       text DEFAULT '제안',                  -- 제안 | 확정 | 보류 | 폐기 등
  votes        jsonb DEFAULT '{"up":[],"down":[]}'::jsonb,  -- 투표
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE hq_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_decisions_auth" ON hq_decisions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 16. hq_board (게시판)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_board (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category   text DEFAULT '자유',                    -- 자유 | 공지 | 질문 | 정보 | 부서
  title      text NOT NULL,
  content    text DEFAULT '',
  author     text DEFAULT '',
  views      integer DEFAULT 0,
  likes      integer DEFAULT 0,
  pinned     boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_board ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_board_auth" ON hq_board
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 17. hq_board_comments (게시판 댓글)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_board_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid NOT NULL,                          -- hq_board.id
  author     text NOT NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_board_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_board_comments_auth" ON hq_board_comments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 18. hq_surveys (설문)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_surveys (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text DEFAULT '',
  author      text DEFAULT '',
  deadline    text,                                  -- YYYY-MM-DD
  status      text DEFAULT '진행중',                 -- 진행중 | 마감 | 예정
  questions   jsonb DEFAULT '[]'::jsonb,             -- SurveyQuestion 배열
  responses   integer DEFAULT 0,                     -- 응답 수 카운터
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_surveys_auth" ON hq_surveys
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 19. hq_survey_responses (설문 응답)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_survey_responses (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id  uuid NOT NULL,                          -- hq_surveys.id
  respondent text NOT NULL,                          -- 응답자 이름
  answers    jsonb DEFAULT '{}'::jsonb,              -- { questionId: answer }
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_survey_responses_auth" ON hq_survey_responses
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 20. hq_calendar / hq_events (일정 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_events (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  date       text NOT NULL,                          -- YYYY-MM-DD (시작일)
  end_date   text,                                   -- YYYY-MM-DD (종료일, nullable)
  color      text DEFAULT 'blue',                    -- 색상 키
  author     text DEFAULT '',
  memo       text,                                   -- 일정 메모
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_events_auth" ON hq_events
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 21. hq_memos (메모)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_memos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content    text NOT NULL,
  author     text DEFAULT '',
  color      text DEFAULT 'white',                   -- 메모 배경색
  pinned     boolean DEFAULT false,
  tags       jsonb DEFAULT '[]'::jsonb,              -- 태그 배열
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_memos_auth" ON hq_memos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 22. hq_chat (팀 채팅)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_chat (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender     text NOT NULL,
  text       text NOT NULL,
  reply_to   jsonb,                                  -- { sender, text } (답장 대상)
  reactions  jsonb DEFAULT '{}'::jsonb,              -- { emoji: [userName, ...] }
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_chat_auth" ON hq_chat
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime 활성화 (채팅)
-- ALTER PUBLICATION supabase_realtime ADD TABLE hq_chat; -- 이미 등록됨


-- ──────────────────────────────────────────────────────────────
-- 23. hq_dm (1:1 다이렉트 메시지)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_dm (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender     text NOT NULL,
  receiver   text NOT NULL,
  text       text NOT NULL,
  reply_to   jsonb,                                  -- { sender, text }
  reactions  jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_dm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_dm_auth" ON hq_dm
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime 활성화 (DM)
-- ALTER PUBLICATION supabase_realtime ADD TABLE hq_dm; -- 이미 등록됨


-- ──────────────────────────────────────────────────────────────
-- 24. hq_files (파일 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_files (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  size        bigint DEFAULT 0,                      -- 파일 크기 (bytes)
  type        text DEFAULT '',                       -- MIME type
  url         text NOT NULL,                         -- 파일 URL
  folder_id   uuid,                                  -- hq_folders.id (nullable = 루트)
  uploaded_by text DEFAULT '',                       -- 업로더 이름
  security    text,                                  -- 보안 등급
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_files_auth" ON hq_files
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 25. hq_folders (폴더 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_folders (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  parent_id  uuid,                                   -- 상위 폴더 (null = 루트)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_folders_auth" ON hq_folders
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 26. hq_contacts (주소록)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_contacts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  department text DEFAULT '',
  position   text DEFAULT '',
  phone      text DEFAULT '',
  email      text DEFAULT '',
  extension  text DEFAULT '',                        -- 내선번호
  mobile     text DEFAULT '',                        -- 연락처 (개인 휴대폰)
  address    text DEFAULT '',                        -- 집주소
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_contacts_auth" ON hq_contacts
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 27. hq_wiki (위키 문서)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_wiki (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  content     text DEFAULT '',
  category    text DEFAULT '',
  author      text DEFAULT '',
  last_editor text DEFAULT '',                       -- 마지막 수정자
  tags        jsonb DEFAULT '[]'::jsonb,             -- 태그 배열
  views       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_wiki ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_wiki_auth" ON hq_wiki
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 28. hq_directives (대표 지시사항 - Dashboard)
--    user_id 기준 upsert
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_directives (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL UNIQUE,                   -- upsert onConflict 용
  content    text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hq_directives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_directives_auth" ON hq_directives
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 29. hq_expenses (경비 지출)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_expenses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author      text NOT NULL,                          -- 등록자 이름
  date        text NOT NULL,                          -- YYYY-MM-DD
  category    text NOT NULL,                          -- 식비 | 교통비 | 사무용품 | 마케팅 | 소프트웨어 | 통신비 | 복리후생 | 기타
  amount      numeric NOT NULL DEFAULT 0,             -- 금액
  currency    text DEFAULT 'KRW',                     -- KRW | USD
  description text DEFAULT '',                        -- 설명
  payment     text DEFAULT '법인카드',                -- 법인카드 | 개인카드 | 사업자카드 | 현금 | 계좌이체
  receipt_url text,                                   -- 영수증 이미지 URL
  status      text DEFAULT '대기',                    -- 대기 | 승인 | 반려
  approver    text,                                   -- 승인자 이름
  memo        text DEFAULT '',                        -- 비고
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hq_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_expenses_auth" ON hq_expenses
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 30. hq_fixed_costs (고정비)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_fixed_costs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,                          -- 항목명 (ex: 김민혁 급여, Vercel Pro, 도메인 등)
  category      text NOT NULL,                          -- 급여 | 임대료 | 도메인 | 서버/클라우드 | 구독서비스 | 보험 | 세금/공과금 | 통신비 | 기타
  amount        numeric NOT NULL DEFAULT 0,             -- 금액 (원)
  billing_cycle text DEFAULT '월',                      -- 월 | 분기 | 반기 | 연
  due_day       int DEFAULT 1,                          -- 납부일 (매월 N일)
  description   text DEFAULT '',                        -- 메모
  active        boolean DEFAULT true,                   -- 활성 여부
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE hq_fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_fixed_costs_auth" ON hq_fixed_costs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 31. hq_resources (자원 마스터)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_resources (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  type        text NOT NULL,              -- 회의실 | 차량 | 장비
  description text DEFAULT '',
  capacity    int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_resources_auth" ON hq_resources FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 32. hq_bookings (자원 예약)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_bookings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id   uuid REFERENCES hq_resources(id) ON DELETE CASCADE,
  resource_name text NOT NULL,
  resource_type text NOT NULL,
  date          text NOT NULL,
  start_time    text NOT NULL,
  end_time      text NOT NULL,
  purpose       text DEFAULT '',
  booker        text NOT NULL,
  status        text DEFAULT '예약',       -- 예약 | 취소
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE hq_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_bookings_auth" ON hq_bookings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 33. hq_courses (교육 과정)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_courses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text DEFAULT '',
  instructor  text DEFAULT '',
  category    text DEFAULT '직무',         -- 직무 | 리더십 | 안전 | IT | 기타
  duration    text DEFAULT '',
  deadline    text,
  status      text DEFAULT '예정',         -- 예정 | 진행중 | 완료
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_courses_auth" ON hq_courses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 34. hq_enrollments (수강 등록)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_enrollments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id    uuid REFERENCES hq_courses(id) ON DELETE CASCADE,
  user_name    text NOT NULL,
  status       text DEFAULT '미수강',      -- 미수강 | 수강중 | 완료
  progress     int DEFAULT 0,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (course_id, user_name)
);
ALTER TABLE hq_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_enrollments_auth" ON hq_enrollments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 35. hq_eval_periods (평가 기간)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_eval_periods (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  start_date text NOT NULL,
  end_date   text NOT NULL,
  type       text DEFAULT 'MBO',           -- MBO | 역량 | 다면
  status     text DEFAULT '진행중',        -- 진행중 | 마감
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hq_eval_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_eval_periods_auth" ON hq_eval_periods FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 36. hq_evaluations (평가 내용)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_evaluations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id        uuid REFERENCES hq_eval_periods(id) ON DELETE CASCADE,
  evaluator        text NOT NULL,
  evaluatee        text NOT NULL,
  type             text DEFAULT '자기',     -- 자기 | 상사 | 동료
  goals_score      int DEFAULT 0,
  competency_score int DEFAULT 0,
  comment          text DEFAULT '',
  status           text DEFAULT '작성중',   -- 작성중 | 제출 | 확정
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE hq_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_evaluations_auth" ON hq_evaluations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 37. hq_job_postings (채용 공고)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_job_postings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  department   text DEFAULT '',
  type         text DEFAULT '정규직',       -- 정규직 | 계약직 | 인턴
  description  text DEFAULT '',
  requirements text DEFAULT '',
  deadline     text,
  status       text DEFAULT '모집중',       -- 모집중 | 마감 | 진행중
  author       text NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE hq_job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_job_postings_auth" ON hq_job_postings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 38. hq_applicants (지원자)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_applicants (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  posting_id  uuid REFERENCES hq_job_postings(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text DEFAULT '',
  phone       text DEFAULT '',
  resume_url  text,
  stage       text DEFAULT '서류검토',     -- 서류검토 | 1차면접 | 2차면접 | 최종합격 | 불합격
  notes       text DEFAULT '',
  applied_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_applicants_auth" ON hq_applicants FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 39. hq_assets (자산 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_assets (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  category        text NOT NULL,            -- 노트북 | 모니터 | 키보드/마우스 | 사무가구 | 차량 | 기타
  serial_number   text DEFAULT '',
  purchase_date   text,
  purchase_price  numeric DEFAULT 0,
  current_holder  text DEFAULT '',
  status          text DEFAULT '보관중',    -- 사용중 | 보관중 | 수리중 | 폐기
  description     text DEFAULT '',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_assets_auth" ON hq_assets FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 40. hq_asset_logs (자산 이력)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_asset_logs (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id  uuid REFERENCES hq_assets(id) ON DELETE CASCADE,
  action    text NOT NULL,                  -- 대여 | 반납 | 수리 | 폐기
  user_name text NOT NULL,
  date      text NOT NULL,
  memo      text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hq_asset_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_asset_logs_auth" ON hq_asset_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 41. hq_crm_companies (거래처/고객)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_crm_companies (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text NOT NULL,
  industry       text DEFAULT '',
  contact_person text DEFAULT '',
  phone          text DEFAULT '',
  email          text DEFAULT '',
  address        text DEFAULT '',
  notes          text DEFAULT '',
  grade          text DEFAULT '일반',       -- VIP | 일반 | 잠재
  author         text NOT NULL,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE hq_crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_crm_companies_auth" ON hq_crm_companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 42. hq_crm_deals (영업 기회)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_crm_deals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title          text NOT NULL,
  company_id     uuid REFERENCES hq_crm_companies(id) ON DELETE CASCADE,
  amount         numeric DEFAULT 0,
  stage          text DEFAULT '발굴',       -- 발굴 | 제안 | 협상 | 계약 | 완료 | 실패
  probability    int DEFAULT 0,
  expected_close text,
  author         text NOT NULL,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE hq_crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_crm_deals_auth" ON hq_crm_deals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 43. hq_crm_activities (CRM 활동)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_crm_activities (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES hq_crm_companies(id) ON DELETE CASCADE,
  type       text NOT NULL,                 -- 전화 | 미팅 | 이메일 | 메모
  content    text DEFAULT '',
  author     text NOT NULL,
  date       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hq_crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_crm_activities_auth" ON hq_crm_activities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 44. hq_shifts (근무 스케줄)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_shifts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name  text NOT NULL,
  date       text NOT NULL,
  shift_type text NOT NULL,                 -- 주간 | 야간 | 오전 | 오후 | 휴무 | 재택
  start_time text DEFAULT '',
  end_time   text DEFAULT '',
  memo       text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_name, date)
);
ALTER TABLE hq_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_shifts_auth" ON hq_shifts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 45. hq_checkins (데일리 체크인)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_checkins (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name      text NOT NULL,
  date           text NOT NULL,
  today_plan     text DEFAULT '',
  yesterday_done text DEFAULT '',
  blockers       text DEFAULT '',
  created_at     timestamptz DEFAULT now(),
  UNIQUE (user_name, date)
);
ALTER TABLE hq_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_checkins_auth" ON hq_checkins FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 46. user_sessions (중복 로그인 방지)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id     uuid PRIMARY KEY,
  session_id  text NOT NULL,
  device      text DEFAULT '',
  last_active timestamptz DEFAULT now()
);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sessions_auth" ON user_sessions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 47. hq_settings (시스템 설정 — 출근시간, 사무실위치, 명함 등)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_settings (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text UNIQUE NOT NULL,                      -- 설정 키 (ex: work_start_time, business_card_김민혁)
  value       text DEFAULT '',                           -- JSON 문자열 또는 단순 값
  updated_by  text,                                      -- 마지막 수정자
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_settings_auth" ON hq_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 48. hq_payslips (급여명세서)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_payslips (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month                text NOT NULL,                     -- YYYY-MM
  name                 text NOT NULL,                     -- 직원 이름
  base_pay             numeric DEFAULT 0,                 -- 기본급
  overtime_pay         numeric DEFAULT 0,                 -- 초과근무수당
  bonus                numeric DEFAULT 0,                 -- 상여금
  national_pension     numeric DEFAULT 0,                 -- 국민연금
  health_insurance     numeric DEFAULT 0,                 -- 건강보험
  employment_insurance numeric DEFAULT 0,                 -- 고용보험
  income_tax           numeric DEFAULT 0,                 -- 소득세
  total_pay            numeric DEFAULT 0,                 -- 총 지급액
  total_deductions     numeric DEFAULT 0,                 -- 총 공제액
  net_pay              numeric DEFAULT 0,                 -- 실수령액
  memo                 text DEFAULT '',
  created_at           timestamptz DEFAULT now(),
  UNIQUE (month, name)
);
ALTER TABLE hq_payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_payslips_auth" ON hq_payslips FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 49. hq_personnel_history (인사 발령 이력)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_personnel_history (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name       text NOT NULL,                          -- 대상 팀원 이름
  change_type     text NOT NULL,                          -- 입사 | 퇴사 | 승진 | 부서이동 | 직책변경
  from_value      text DEFAULT '',                        -- 변경 전 값
  to_value        text DEFAULT '',                        -- 변경 후 값
  effective_date  text NOT NULL,                          -- YYYY-MM-DD 발령일
  note            text DEFAULT '',                        -- 비고/사유
  created_by      text NOT NULL,                          -- 등록자
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_personnel_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_personnel_history_auth" ON hq_personnel_history FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 50. hq_mail (사내 메일)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_mail (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name   text NOT NULL,                              -- 발신자
  to_name     text NOT NULL,                              -- 수신자
  subject     text DEFAULT '',                            -- 제목
  body        text DEFAULT '',                            -- 본문
  read        boolean DEFAULT false,                      -- 읽음 여부
  starred     boolean DEFAULT false,                      -- 즐겨찾기
  folder      text DEFAULT '받은편지함',                   -- 받은편지함 | 보낸편지함 | 중요 | 임시보관함 | 휴지통
  attachments jsonb DEFAULT '[]'::jsonb,                  -- 첨부파일 배열
  read_at     timestamptz,                                -- 읽은 시각
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_mail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_mail_auth" ON hq_mail FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 51. hq_kudos (칭찬/인정)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_kudos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name   text NOT NULL,                              -- 보낸 사람
  to_name     text NOT NULL,                              -- 받은 사람
  message     text NOT NULL,                              -- 칭찬 메시지
  emoji       text DEFAULT '',                            -- 이모지
  category    text DEFAULT '업무성과',                     -- 업무성과 | 팀워크 | 리더십 | 창의성 | 도움 | 기타
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_kudos_auth" ON hq_kudos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 52. hq_certificates (증명서 발급)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_certificates (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name   text NOT NULL,                          -- 대상 직원
  cert_type       text NOT NULL,                          -- 재직증명서 | 경력증명서 | 퇴직증명서
  cert_number     text UNIQUE NOT NULL,                   -- 증명서 번호 (고유)
  issued_by       text NOT NULL,                          -- 발급자
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_certificates_auth" ON hq_certificates FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 53. hq_visitors (방문자 관리)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_visitors (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,                          -- 방문자 이름
  company         text DEFAULT '',                        -- 방문자 소속
  purpose         text DEFAULT '',                        -- 방문 목적
  host            text NOT NULL,                          -- 담당자 (사내)
  visit_date      text NOT NULL,                          -- YYYY-MM-DD
  expected_time   text DEFAULT '',                        -- 예정 시간 HH:MM
  arrival_time    text,                                   -- 실제 도착 시간
  departure_time  text,                                   -- 퇴실 시간
  phone           text DEFAULT '',                        -- 방문자 연락처
  vehicle_no      text DEFAULT '',                        -- 차량 번호
  status          text DEFAULT '예약',                    -- 예약 | 방문중 | 퇴실
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_visitors_auth" ON hq_visitors FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 54. hq_vehicle_logs (차량 운행 기록)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_vehicle_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date            text NOT NULL,                          -- YYYY-MM-DD
  driver          text NOT NULL,                          -- 운전자
  vehicle_name    text NOT NULL,                          -- 차량명
  purpose         text DEFAULT '',                        -- 운행 목적
  from_location   text DEFAULT '',                        -- 출발지
  to_location     text DEFAULT '',                        -- 도착지
  departure_km    numeric DEFAULT 0,                      -- 출발 km
  arrival_km      numeric DEFAULT 0,                      -- 도착 km
  distance        numeric DEFAULT 0,                      -- 주행 거리
  fuel_amount     numeric DEFAULT 0,                      -- 주유량 (L)
  fuel_cost       numeric DEFAULT 0,                      -- 주유비 (원)
  memo            text DEFAULT '',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_vehicle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_vehicle_logs_auth" ON hq_vehicle_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 55. hq_file_stars (파일 즐겨찾기)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_file_stars (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id     uuid NOT NULL,                              -- hq_files.id
  user_id     uuid NOT NULL,                              -- auth.users.id
  created_at  timestamptz DEFAULT now(),
  UNIQUE (file_id, user_id)
);
ALTER TABLE hq_file_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_file_stars_auth" ON hq_file_stars FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 56. hq_file_shares (파일 공유 링크)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_file_shares (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id       uuid NOT NULL,                            -- hq_files.id
  share_token   text UNIQUE NOT NULL,                     -- 공유 토큰
  expires_at    timestamptz,                              -- 만료 시각
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE hq_file_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_file_shares_auth" ON hq_file_shares FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 57. hq_file_tags (파일 색상 태그)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_file_tags (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id     uuid UNIQUE NOT NULL,                       -- hq_files.id (파일당 1태그)
  color       text NOT NULL,                              -- red | orange | yellow | green | blue | purple
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_file_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_file_tags_auth" ON hq_file_tags FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 58. hq_file_versions (파일 버전 이력)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_file_versions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id         uuid NOT NULL,                          -- hq_files.id
  version_number  int NOT NULL,                           -- 버전 번호
  url             text NOT NULL,                          -- 파일 URL
  size            bigint DEFAULT 0,                       -- 파일 크기 (bytes)
  uploaded_by     text DEFAULT '',                        -- 업로더
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE hq_file_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_file_versions_auth" ON hq_file_versions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 59. hq_notifications (알림)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL,                              -- booking | mail | approval 등
  message     text NOT NULL,                              -- 알림 메시지
  target_user text NOT NULL,                              -- 수신 대상
  created_by  text DEFAULT '',                            -- 발신자
  read        boolean DEFAULT false,                      -- 읽음 여부
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_notifications_auth" ON hq_notifications FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 60. hq_audit_log (감사 로그)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_audit_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name   text NOT NULL,                              -- 행위자
  action      text NOT NULL,                              -- 행위 (로그인, 파일열람 등)
  detail      text DEFAULT '',                            -- 상세 내용
  browser     text DEFAULT '',                            -- 브라우저/OS 정보
  ip          text DEFAULT '',                            -- IP 주소
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE hq_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_audit_log_auth" ON hq_audit_log FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ──────────────────────────────────────────────────────────────
-- 61. hq_booking_invitations (예약 초대)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_booking_invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  uuid NOT NULL,                              -- hq_bookings.id
  target_user text NOT NULL,                              -- 초대 대상
  response    text DEFAULT '대기',                        -- 대기 | 수락 | 거절
  created_at  timestamptz DEFAULT now(),
  UNIQUE (booking_id, target_user)
);
ALTER TABLE hq_booking_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_booking_invitations_auth" ON hq_booking_invitations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ============================================================
-- 완료! 총 61개 테이블 생성
-- 참고: hq-files Storage 버킷은 Supabase 대시보드에서 별도 생성 필요
-- ============================================================
