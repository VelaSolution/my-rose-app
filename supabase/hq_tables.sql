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


-- ============================================================
-- 완료! 총 28개 테이블 생성
-- 참고: hq-files Storage 버킷은 Supabase 대시보드에서 별도 생성 필요
-- ============================================================
