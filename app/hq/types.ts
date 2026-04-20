// ── HQ 공유 타입 ──────────────────────────────────────

export type Tab =
  | "dashboard" | "attendance" | "task" | "board" | "chat"
  | "docs" | "approval" | "finance" | "team" | "resource"
  | "performance" | "admin";

export type HQRole = "대표" | "이사" | "팀장" | "팀원";

// ── 기존 타입 ──────────────────────────────────────────
export type Decision = { id: string; title: string; decision: string; reason: string; owner: string; date: string; followUp: string };
export type TaskComment = { id: string; author: string; text: string; time: string };
export type ReportType = "daily" | "weekly" | "issue" | "project";
export type ReportStatus = "draft" | "submitted" | "approved" | "rejected";
export type DailyReport = { id: string; date: string; content: string; problems: string; nextSteps: string; status?: ReportStatus; approver?: string };
export type IssueReport = { id: string; title: string; description: string; priority: string; status: string; reportStatus?: ReportStatus; approver?: string };
export type ProjectReport = { id: string; title: string; progress: number; description: string; deadline: string; reportStatus?: ReportStatus; approver?: string };
export type Approval = { id: string; title: string; content: string; author: string; approver: string; status: "대기" | "승인" | "반려"; comment: string; fileUrl?: string; fileName?: string; date: string };
export type Folder = { id: string; name: string; parentId?: string };
export type FileItem = { id: string; name: string; size: string; type: string; url: string; uploadedAt: string; uploadedBy: string; folderId?: string; security?: string };
export type ChatMsg = { id: string; sender: string; text: string; time: string };
export type TeamMember = { id: string; name: string; role: string; email: string; status: "active" | "away" | "offline"; hqRole: HQRole };
export type Notice = { id: string; title: string; content: string; date: string; pinned: boolean; author: string; readBy?: string[] };
export type Feedback = { id: string; type: string; title: string; description: string; priority: string; status: string; date: string; author: string };
export type MemoItem = { id: string; content: string; time: string };
export type Mett = { id: string; mission: string; enemy: string; terrain: string; troops: string; time_constraint: string; civil: string; created_at: string };
export type Metric = { id: string; date: string; revenue: number; users_count: number; conversion_rate: number; profit: number };
export type Goal = { id: string; title: string; target_value: number; current_value: number; metric_type: string; start_date: string; end_date: string; status: string };
export type Task = { id: string; goal_id: string | null; title: string; assignee: string; deadline: string; status: string; result: string };
export type AAR = { id: string; date: string; goal: string; result: string; gap_reason: string; improvement: string };

// ── 하이윅스 신규 타입 ─────────────────────────────────
export type AttendanceRecord = {
  id: string; date: string; clockIn: string; clockOut: string;
  status: "정상" | "지각" | "조퇴" | "결근" | "휴가" | "출장";
  overtime: number; memo: string; userName: string;
};
export type LeaveRequest = {
  id: string; type: "연차" | "반차(오전)" | "반차(오후)" | "병가" | "경조" | "출장" | "기타";
  startDate: string; endDate: string; reason: string;
  status: "대기" | "승인" | "반려"; approver: string;
  requester: string; days: number; date: string;
};
export type Contact = {
  id: string; name: string; department: string; position: string;
  phone: string; email: string; extension: string;
  profileImg?: string; manager?: string;
};
export type BugStatus = "접수" | "진행" | "완료" | "보류";
export type BugPriority = "긴급" | "높음" | "보통" | "낮음";
export type BoardPost = {
  id: string; category: "자유" | "공지" | "질문" | "정보" | "부서" | "버그" | "건의";
  title: string; content: string; author: string; date: string;
  views: number; likes: number; comments: number; pinned: boolean;
  bugStatus?: BugStatus; bugPriority?: BugPriority;
};
export type BoardComment = { id: string; postId: string; author: string; content: string; date: string };
export type SurveyItem = {
  id: string; title: string; description: string; author: string;
  deadline: string; status: "진행중" | "마감" | "예정";
  questions: SurveyQuestion[]; responses: number; date: string;
};
export type SurveyQuestion = {
  id: string; type: "단일선택" | "복수선택" | "서술형" | "평점";
  question: string; options?: string[];
};
export type SurveyResponse = { id: string; surveyId: string; answers: Record<string, string | string[]>; respondent: string; date: string };
export type WikiArticle = {
  id: string; title: string; content: string; category: string;
  author: string; lastEditor: string; date: string; updatedAt: string;
  tags: string[]; views: number;
};
export type Expense = {
  id: string; author: string; date: string;
  category: "식비" | "교통비" | "사무용품" | "마케팅" | "소프트웨어" | "통신비" | "복리후생" | "기타";
  amount: number; description: string;
  payment: "법인카드" | "개인카드" | "현금" | "계좌이체";
  receipt_url?: string; status: "대기" | "승인" | "반려";
  approver?: string; memo: string; created_at: string;
};
export type FixedCost = {
  id: string; name: string;
  category: "급여" | "임대료" | "도메인" | "서버/클라우드" | "구독서비스" | "보험" | "세금/공과금" | "통신비" | "기타";
  amount: number; billing_cycle: "월" | "분기" | "반기" | "연";
  due_day: number; description: string; active: boolean;
  created_at: string;
};

// ── 탭 설정 (12탭) ────────────────────────────────────
export const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "홈", icon: "🏠" },
  { key: "attendance", label: "근태", icon: "⏰" },
  { key: "task", label: "업무", icon: "✅" },
  { key: "board", label: "게시판", icon: "💬" },
  { key: "chat", label: "채팅", icon: "💬" },
  { key: "docs", label: "문서", icon: "📁" },
  { key: "approval", label: "결재", icon: "✍️" },
  { key: "finance", label: "재무", icon: "💰" },
  { key: "team", label: "팀", icon: "👥" },
  { key: "resource", label: "자원", icon: "🏢" },
  { key: "performance", label: "성과", icon: "📊" },
  { key: "admin", label: "관리", icon: "⚙️" },
];

export const SIDEBAR_GROUPS: { label: string; items: Tab[] }[] = [
  { label: "메인", items: ["dashboard", "task", "chat"] },
  { label: "근무", items: ["attendance", "board"] },
  { label: "업무", items: ["approval", "docs", "performance"] },
  { label: "경영", items: ["finance", "team", "resource", "admin"] },
];

export const ROLE_PERMISSIONS: Record<HQRole, Tab[]> = {
  "대표": TABS.map(t => t.key),
  "이사": TABS.map(t => t.key).filter(k => k !== "team"),
  "팀장": ["dashboard", "attendance", "task", "board", "chat", "docs", "approval", "finance", "team", "resource", "performance", "admin"],
  "팀원": ["dashboard", "attendance", "task", "board", "chat", "docs", "finance", "resource", "performance"],
};

export const TAB_MAP = Object.fromEntries(TABS.map(t => [t.key, t]));

// ── 상태 뱃지 ──────────────────────────────────────────
export const ST: Record<string, { bg: string; label: string }> = {
  active: { bg: "bg-blue-50 text-blue-700", label: "진행" },
  completed: { bg: "bg-emerald-50 text-emerald-700", label: "완료" },
  failed: { bg: "bg-red-50 text-red-700", label: "실패" },
  pending: { bg: "bg-slate-50 text-slate-600", label: "대기" },
  planned: { bg: "bg-slate-50 text-slate-600", label: "대기" },
  in_progress: { bg: "bg-amber-50 text-amber-700", label: "진행중" },
  review: { bg: "bg-purple-50 text-purple-700", label: "검토" },
};
export const REPORT_ST: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-slate-50 text-slate-600", label: "작성중" },
  submitted: { bg: "bg-blue-50 text-blue-700", label: "제출됨" },
  approved: { bg: "bg-emerald-50 text-emerald-700", label: "승인" },
  rejected: { bg: "bg-red-50 text-red-700", label: "반려" },
};
