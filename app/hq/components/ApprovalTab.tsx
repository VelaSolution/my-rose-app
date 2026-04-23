"use client";

import { useState, useEffect, useRef } from "react";
import { HQRole, Approval } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  "\uB300\uAE30": "bg-amber-50 text-amber-700",
  "\uC2B9\uC778": "bg-emerald-50 text-emerald-700",
  "\uBC18\uB824": "bg-red-50 text-red-700",
};

type TeamMember = { name: string; hqRole: string };

interface EnrichedApproval extends Approval {
  urgent?: boolean;
  approved_at?: string;
  seq?: number;
}

// ── 양식 템플릿 정의 ──────────────────────────────────
type TemplateType = "자유양식" | "휴가신청서" | "지출결의서" | "출장신청서" | "구매요청서" | "업무협조전" | "시말서" | "경조사신청서" | "회의록" | "교육신청서" | "기안서" | "일일보고서" | "주간보고서" | "월간보고서";

const TEMPLATE_TYPES: TemplateType[] = [
  "자유양식", "휴가신청서", "지출결의서", "출장신청서", "구매요청서",
  "업무협조전", "시말서", "경조사신청서", "회의록", "교육신청서", "기안서",
  "일일보고서", "주간보고서", "월간보고서",
];

interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  options?: string[];
  placeholder?: string;
}

const TEMPLATE_FIELDS: Record<Exclude<TemplateType, "자유양식">, TemplateField[]> = {
  "휴가신청서": [
    { key: "leave_type", label: "휴가 종류", type: "select", options: ["연차", "반차(오전)", "반차(오후)", "병가", "경조", "특별휴가", "무급휴가"] },
    { key: "start_date", label: "시작일", type: "date" },
    { key: "end_date", label: "종료일", type: "date" },
    { key: "days", label: "사용 일수", type: "number", placeholder: "1" },
    { key: "reason", label: "사유", type: "textarea", placeholder: "휴가 사유를 입력하세요" },
    { key: "contact", label: "비상연락처", type: "text", placeholder: "010-0000-0000" },
    { key: "handover", label: "업무 인수인계", type: "textarea", placeholder: "인수인계 사항을 작성하세요" },
  ],
  "지출결의서": [
    { key: "expense_date", label: "지출일자", type: "date" },
    { key: "category", label: "지출 항목", type: "select", options: ["식비", "교통비", "사무용품", "마케팅", "소프트웨어", "통신비", "복리후생", "기타"] },
    { key: "amount", label: "금액 (원)", type: "number", placeholder: "0" },
    { key: "payment", label: "결제 수단", type: "select", options: ["법인카드", "개인카드", "현금", "계좌이체"] },
    { key: "vendor", label: "거래처", type: "text", placeholder: "거래처명" },
    { key: "purpose", label: "지출 목적", type: "textarea", placeholder: "지출 목적 및 상세 내역을 입력하세요" },
    { key: "receipt", label: "영수증 번호", type: "text", placeholder: "영수증 번호" },
  ],
  "출장신청서": [
    { key: "destination", label: "출장지", type: "text", placeholder: "출장 목적지" },
    { key: "start_date", label: "출발일", type: "date" },
    { key: "end_date", label: "복귀일", type: "date" },
    { key: "purpose", label: "출장 목적", type: "textarea", placeholder: "출장 목적을 상세히 기술하세요" },
    { key: "schedule", label: "출장 일정", type: "textarea", placeholder: "일자별 세부 일정을 작성하세요" },
    { key: "budget", label: "예상 경비 (원)", type: "number", placeholder: "0" },
    { key: "transport", label: "교통수단", type: "select", options: ["항공", "KTX", "자가용", "버스", "기타"] },
    { key: "accommodation", label: "숙소", type: "text", placeholder: "숙소명 또는 주소" },
  ],
  "구매요청서": [
    { key: "item_name", label: "품목명", type: "text", placeholder: "구매 품목" },
    { key: "quantity", label: "수량", type: "number", placeholder: "1" },
    { key: "unit_price", label: "단가 (원)", type: "number", placeholder: "0" },
    { key: "total_price", label: "총 금액 (원)", type: "number", placeholder: "0" },
    { key: "vendor", label: "구매처", type: "text", placeholder: "구매처명" },
    { key: "purpose", label: "구매 사유", type: "textarea", placeholder: "구매 목적을 입력하세요" },
    { key: "delivery_date", label: "희망 납품일", type: "date" },
    { key: "spec", label: "상세 규격", type: "textarea", placeholder: "제품 규격 및 사양" },
  ],
  "업무협조전": [
    { key: "to_dept", label: "수신 부서", type: "text", placeholder: "수신 부서명" },
    { key: "from_dept", label: "발신 부서", type: "text", placeholder: "발신 부서명" },
    { key: "subject", label: "협조 사항", type: "text", placeholder: "협조 제목" },
    { key: "detail", label: "세부 내용", type: "textarea", placeholder: "협조 요청 내용을 상세히 기술하세요" },
    { key: "deadline", label: "처리 기한", type: "date" },
    { key: "reference", label: "참고 사항", type: "textarea", placeholder: "참고 사항이 있으면 작성하세요" },
  ],
  "시말서": [
    { key: "incident_date", label: "발생일시", type: "date" },
    { key: "location", label: "발생장소", type: "text", placeholder: "사건 발생 장소" },
    { key: "incident", label: "사건 경위", type: "textarea", placeholder: "사건의 경위를 상세히 기술하세요" },
    { key: "cause", label: "원인 분석", type: "textarea", placeholder: "사건의 원인을 분석하세요" },
    { key: "damage", label: "피해 내역", type: "textarea", placeholder: "피해 사항을 기술하세요" },
    { key: "prevention", label: "재발 방지 대책", type: "textarea", placeholder: "향후 재발 방지를 위한 대책을 작성하세요" },
  ],
  "경조사신청서": [
    { key: "event_type", label: "경조 구분", type: "select", options: ["결혼", "출산", "회갑", "칠순", "사망(본인가족)", "사망(배우자가족)", "기타"] },
    { key: "event_date", label: "경조일", type: "date" },
    { key: "relation", label: "대상/관계", type: "text", placeholder: "대상자 및 관계" },
    { key: "venue", label: "장소", type: "text", placeholder: "행사 장소" },
    { key: "leave_days", label: "경조휴가일수", type: "number", placeholder: "1" },
    { key: "memo", label: "비고", type: "textarea", placeholder: "추가 참고 사항" },
  ],
  "회의록": [
    { key: "meeting_date", label: "회의 일시", type: "date" },
    { key: "location", label: "회의 장소", type: "text", placeholder: "회의실 또는 온라인" },
    { key: "attendees", label: "참석자", type: "text", placeholder: "참석자 명단 (쉼표 구분)" },
    { key: "agenda", label: "회의 안건", type: "textarea", placeholder: "회의 안건을 작성하세요" },
    { key: "discussion", label: "논의 내용", type: "textarea", placeholder: "논의 내용을 상세히 기록하세요" },
    { key: "decisions", label: "결정 사항", type: "textarea", placeholder: "결정된 사항을 작성하세요" },
    { key: "action_items", label: "후속 조치", type: "textarea", placeholder: "담당자, 기한 포함 후속 조치 작성" },
  ],
  "교육신청서": [
    { key: "edu_name", label: "교육명", type: "text", placeholder: "교육 프로그램명" },
    { key: "institution", label: "교육 기관", type: "text", placeholder: "교육 기관명" },
    { key: "start_date", label: "교육 시작일", type: "date" },
    { key: "end_date", label: "교육 종료일", type: "date" },
    { key: "hours", label: "교육 시간", type: "number", placeholder: "8" },
    { key: "cost", label: "교육비 (원)", type: "number", placeholder: "0" },
    { key: "purpose", label: "교육 목적", type: "textarea", placeholder: "교육 참가 목적 및 기대 효과" },
    { key: "apply_plan", label: "업무 적용 계획", type: "textarea", placeholder: "교육 후 업무 적용 계획" },
  ],
  "기안서": [
    { key: "category", label: "기안 구분", type: "select", options: ["일반", "인사", "재무", "영업", "기술", "기타"] },
    { key: "subject", label: "기안 제목", type: "text", placeholder: "기안 제목" },
    { key: "background", label: "추진 배경", type: "textarea", placeholder: "추진 배경 및 현황을 기술하세요" },
    { key: "proposal", label: "기안 내용", type: "textarea", placeholder: "기안 내용을 상세히 작성하세요" },
    { key: "effect", label: "기대 효과", type: "textarea", placeholder: "기대되는 효과를 기술하세요" },
    { key: "budget", label: "소요 예산 (원)", type: "number", placeholder: "0" },
    { key: "schedule", label: "추진 일정", type: "textarea", placeholder: "단계별 추진 일정을 작성하세요" },
  ],
  "일일보고서": [
    { key: "report_date", label: "보고일", type: "date" },
    { key: "completed", label: "금일 완료 업무", type: "textarea", placeholder: "오늘 완료한 업무를 작성하세요" },
    { key: "in_progress", label: "진행 중 업무", type: "textarea", placeholder: "현재 진행 중인 업무를 작성하세요" },
    { key: "planned", label: "익일 예정 업무", type: "textarea", placeholder: "내일 예정된 업무를 작성하세요" },
    { key: "issues", label: "이슈/건의 사항", type: "textarea", placeholder: "이슈나 건의 사항이 있으면 작성하세요" },
  ],
  "주간보고서": [
    { key: "week_start", label: "주간 시작일", type: "date" },
    { key: "week_end", label: "주간 종료일", type: "date" },
    { key: "summary", label: "주간 업무 요약", type: "textarea", placeholder: "이번 주 핵심 업무 성과를 요약하세요" },
    { key: "completed", label: "완료 업무", type: "textarea", placeholder: "이번 주 완료한 업무 목록" },
    { key: "in_progress", label: "진행 중 업무", type: "textarea", placeholder: "다음 주로 이어지는 업무" },
    { key: "next_week", label: "차주 계획", type: "textarea", placeholder: "다음 주 예정된 업무 계획" },
    { key: "issues", label: "이슈/건의 사항", type: "textarea", placeholder: "이슈나 건의 사항" },
    { key: "kpi", label: "KPI 달성 현황", type: "textarea", placeholder: "주간 KPI 달성 현황 (수치 포함)" },
  ],
  "월간보고서": [
    { key: "month", label: "보고 월", type: "text", placeholder: "2026년 4월" },
    { key: "summary", label: "월간 업무 요약", type: "textarea", placeholder: "이번 달 핵심 성과를 요약하세요" },
    { key: "achievements", label: "주요 성과", type: "textarea", placeholder: "이번 달 주요 달성 사항" },
    { key: "metrics", label: "성과 지표", type: "textarea", placeholder: "매출, KPI 등 정량적 성과 (수치 포함)" },
    { key: "challenges", label: "과제/이슈", type: "textarea", placeholder: "이번 달 겪은 과제와 해결 현황" },
    { key: "next_month", label: "차월 계획", type: "textarea", placeholder: "다음 달 업무 계획 및 목표" },
    { key: "budget_status", label: "예산 집행 현황", type: "textarea", placeholder: "예산 대비 집행 현황" },
  ],
};

function buildTemplateContent(template: TemplateType, fields: Record<string, string>): string {
  if (template === "자유양식") return "";
  const defs = TEMPLATE_FIELDS[template];
  const lines: string[] = [`[${template}]`, ""];
  for (const f of defs) {
    const val = fields[f.key] || "";
    if (f.type === "textarea") {
      lines.push(`■ ${f.label}:`);
      lines.push(val || "(미입력)");
      lines.push("");
    } else {
      lines.push(`• ${f.label}: ${val || "(미입력)"}`);
    }
  }
  return lines.join("\n");
}

// ── 위임 데이터 타입 ──────────────────────────────────
interface DelegationData {
  delegate: string;
  start: string;
  end: string;
  reason: string;
  active: boolean;
}

export default function ApprovalTab({ userId, userName, myRole, flash }: Props) {
  const [list, setList] = useState<EnrichedApproval[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "pending">("all");
  const [approvers, setApprovers] = useState<TeamMember[]>([]);
  const [selectedApprover, setSelectedApprover] = useState("");
  const [approverSearch, setApproverSearch] = useState("");
  const [showApproverList, setShowApproverList] = useState(false);
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [approvalLine, setApprovalLine] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── 양식 템플릿 state ──────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("자유양식");
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});

  // ── 조직도 결재선 (전체 팀원 대상 drag-reorder) ────
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [showOrgChart, setShowOrgChart] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ── 결재 위임 state ────────────────────────────────
  const [showDelegation, setShowDelegation] = useState(false);
  const [delegateTo, setDelegateTo] = useState("");
  const [delegateStart, setDelegateStart] = useState(today());
  const [delegateEnd, setDelegateEnd] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [delegations, setDelegations] = useState<{ owner: string; data: DelegationData }[]>([]);

  const { displayName } = useTeamDisplayNames();
  const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  /** PDF 다운로드 (인쇄용 HTML) */
  function openPrintableApproval(a: EnrichedApproval) {
    const line = parseApprovalLine(a.approver);
    const approvedSteps = parseApprovedSteps(a);
    const fmtDt = (d: string) => new Date(d).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

    const stepBoxesHtml = line.map((name, idx) => {
      const isDone = a.status !== "반려" && idx < approvedSteps;
      const isRejectedAt = a.status === "반려" && idx === approvedSteps;
      const bg = isDone ? "#ecfdf5" : isRejectedAt ? "#fef2f2" : "#f8fafc";
      const border = isDone ? "#10b981" : isRejectedAt ? "#ef4444" : "#cbd5e1";
      const color = isDone ? "#059669" : isRejectedAt ? "#dc2626" : "#94a3b8";
      const statusText = isDone ? "승인" : isRejectedAt ? "반려" : "대기";
      return `<div style="display:inline-block;text-align:center;margin:0 4px;">
        ${idx > 0 ? '<span style="font-size:14px;color:#94a3b8;margin:0 4px;">&rarr;</span>' : ''}
        <div style="border:2px solid ${border};background:${bg};border-radius:8px;padding:12px 16px;min-width:80px;">
          <div style="font-size:11px;color:#94a3b8;">${idx + 1}단계</div>
          <div style="font-size:14px;font-weight:bold;color:${color};margin:4px 0;">${name}</div>
          <div style="font-size:11px;color:${color};">${statusText}</div>
        </div>
      </div>`;
    }).join("");

    const attachmentHtml = a.fileUrl
      ? `<div style="margin-top:24px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <p style="font-size:12px;color:#64748b;font-weight:bold;margin-bottom:4px;">첨부파일</p>
          <a href="${a.fileUrl}" target="_blank" style="font-size:13px;color:#3182F6;text-decoration:underline;">${a.fileName || "첨부파일"}</a>
        </div>`
      : "";

    const commentHtml = a.comment
      ? `<div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
          <p style="font-size:12px;color:#92400e;font-weight:bold;margin-bottom:4px;">결재 의견</p>
          <p style="font-size:13px;color:#78350f;">${a.comment}</p>
        </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${a.title}</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 15mm; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; background: #f5f5f5; color: #1e293b; }
  .page {
    width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff;
    padding: 40px 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  .company-header {
    text-align: center; border-bottom: 3px solid #3182F6;
    padding-bottom: 16px; margin-bottom: 30px;
  }
  .company-header h2 { font-size: 14px; color: #3182F6; letter-spacing: 4px; margin-bottom: 4px; }
  .doc-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: 6px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .info-table th, .info-table td { border: 1px solid #e2e8f0; padding: 10px 14px; font-size: 13px; }
  .info-table th { background: #f8fafc; font-weight: bold; width: 20%; text-align: center; color: #475569; }
  .info-table td { color: #1e293b; }
  .status-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;
  }
  .approval-line { margin: 24px 0; text-align: center; }
  .content-section { margin: 24px 0; }
  .content-section h3 { font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .content-body { font-size: 14px; line-height: 1.8; white-space: pre-wrap; padding: 16px; background: #fafafa; border-radius: 8px; border: 1px solid #f1f5f9; }
  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .print-btn {
    position: fixed; bottom: 30px; right: 30px;
    background: #3182F6; color: #fff; border: none; padding: 14px 28px;
    font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer;
    box-shadow: 0 4px 12px rgba(49,130,246,0.3);
  }
  .print-btn:hover { background: #2672DE; }
</style>
</head>
<body>
<div class="page">
  <div class="company-header">
    <h2>VELA SOLUTION</h2>
    <p style="font-size:12px;color:#94a3b8;">주식회사 벨라솔루션</p>
  </div>
  <div class="doc-title">${a.title}</div>
  <table class="info-table">
    <tr>
      <th>문서번호</th><td>결재-${String(a.seq ?? 0).padStart(3, "0")}</td>
      <th>상태</th>
      <td><span class="status-badge" style="background:${a.status === "승인" ? "#ecfdf5;color:#059669" : a.status === "반려" ? "#fef2f2;color:#dc2626" : "#fffbeb;color:#d97706"}">${a.status}</span></td>
    </tr>
    <tr>
      <th>기안자</th><td>${a.author}</td>
      <th>기안일</th><td>${fmtDt(a.date)}</td>
    </tr>
    <tr>
      <th>결재자</th><td colspan="3">${line.join(" → ")}</td>
    </tr>
    ${a.approved_at ? `<tr><th>결재완료일</th><td colspan="3">${fmtDt(a.approved_at)}</td></tr>` : ""}
    ${a.urgent ? `<tr><th>긴급</th><td colspan="3" style="color:#dc2626;font-weight:bold;">긴급 결재</td></tr>` : ""}
  </table>
  <div class="approval-line">
    <p style="font-size:12px;font-weight:bold;color:#64748b;margin-bottom:12px;">결재선</p>
    ${stepBoxesHtml}
  </div>
  <div class="content-section">
    <h3>결재 내용</h3>
    <div class="content-body">${(a.content || "(내용 없음)").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
  ${commentHtml}
  ${attachmentHtml}
  <div class="footer">
    <p>본 문서는 VELA HQ 전자결재 시스템에서 생성되었습니다.</p>
    <p>출력일: ${new Date().toLocaleString("ko-KR")}</p>
  </div>
</div>
<button class="print-btn no-print" onclick="window.print()">인쇄 / PDF 저장</button>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  /** 결재선 파싱: JSON 배열이면 다단계, 일반 문자열이면 단일 결재자 */
  function parseApprovalLine(approver: string): string[] {
    try {
      const parsed = JSON.parse(approver);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* plain string */ }
    return [approver];
  }

  /** 결재 진행 상황 파싱: approved_steps는 승인 완료된 단계 수 */
  function parseApprovedSteps(a: EnrichedApproval): number {
    try {
      const steps = JSON.parse((a as any).approved_steps || "0");
      return typeof steps === "number" ? steps : 0;
    } catch { return a.status === "승인" ? parseApprovalLine(a.approver).length : 0; }
  }

  /** 현재 결재 순서의 결재자 이름 */
  function currentApproverName(a: EnrichedApproval): string | null {
    const line = parseApprovalLine(a.approver);
    const step = parseApprovedSteps(a);
    if (a.status === "반려" || a.status === "승인") return null;
    return step < line.length ? line[step] : null;
  }

  /** 활성 위임 조회: 특정 결재자에 대해 활성 위임이 있으면 delegate 반환 */
  function getActiveDelegateFor(approverName: string): string | null {
    const d = delegations.find(
      del => del.owner === approverName && del.data.active &&
        del.data.start <= today() && del.data.end >= today()
    );
    return d ? d.data.delegate : null;
  }

  /** 현재 사용자가 위임받은 결재를 처리할 수 있는지 확인 */
  function canActAsDelegateFor(a: EnrichedApproval): string | null {
    const current = currentApproverName(a);
    if (!current) return null;
    const delegate = getActiveDelegateFor(current);
    if (delegate === userName) return current; // 원래 결재자 이름 반환
    return null;
  }

  // ── 위임 데이터 로드 ───────────────────────────────
  const loadDelegations = async () => {
    const s = sb();
    if (!s) return;
    const { data } = await s.from("hq_settings")
      .select("*")
      .like("key", "approval_delegation_%");
    if (data) {
      const parsed: { owner: string; data: DelegationData }[] = [];
      for (const row of data) {
        try {
          const owner = (row.key as string).replace("approval_delegation_", "");
          const val: DelegationData = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          parsed.push({ owner, data: val });
        } catch { /* skip invalid */ }
      }
      setDelegations(parsed);
    }
  };

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const [{ data }, { data: teamData }] = await Promise.all([
      s.from("hq_approvals").select("*").order("created_at", { ascending: false }),
      s.from("hq_team").select("name, hq_role").order("created_at", { ascending: true }),
    ]);
    if (data)
      setList(data.map((r: any, index: number) => ({
        id: r.id, title: r.title, content: r.content,
        author: r.author, approver: r.approver,
        status: r.status, comment: r.comment || "",
        fileUrl: r.file_url, fileName: r.file_name,
        date: r.created_at,
        urgent: r.urgent ?? false,
        approved_at: r.approved_at ?? null,
        approved_steps: r.approved_steps ?? "0",
        seq: data.length - index,
      })));
    if (teamData) {
      const members = (teamData as any[]).map(m => ({ name: m.name, hqRole: m.hq_role ?? "팀원" }));
      setApprovers(members.filter(m => ["대표", "이사"].includes(m.hqRole)));
      setAllTeamMembers(members);
    }
    setLoading(false);
  };

  useEffect(() => { load(); loadDelegations(); }, []);

  // ── 양식 변경 시 제목 자동 설정 ────────────────────
  const handleTemplateChange = (tmpl: TemplateType) => {
    setSelectedTemplate(tmpl);
    setTemplateFields({});
    if (tmpl !== "자유양식") {
      setTitle(`[${tmpl}] `);
      setContent("");
    } else {
      setTitle("");
      setContent("");
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setTemplateFields(prev => ({ ...prev, [key]: value }));
  };

  const addToApprovalLine = (name: string) => {
    if (approvalLine.includes(name)) return flash("이미 결재선에 추가된 결재자입니다");
    if (name === userName && myRole !== "대표") return flash("대표만 자가결재가 가능합니다");
    setApprovalLine(prev => [...prev, name]);
    setApproverSearch("");
    setShowApproverList(false);
  };

  const removeFromApprovalLine = (index: number) => {
    setApprovalLine(prev => prev.filter((_, i) => i !== index));
  };

  const moveApprovalLine = (index: number, direction: "up" | "down") => {
    setApprovalLine(prev => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ── Drag & Drop 결재선 재정렬 ──────────────────────
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === to) { dragItem.current = null; dragOverItem.current = null; return; }
    setApprovalLine(prev => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // ── 결재 위임 저장 ────────────────────────────────
  const saveDelegation = async () => {
    if (!delegateTo) return flash("위임 대상자를 선택하세요");
    if (!delegateEnd) return flash("종료일을 입력하세요");
    if (delegateStart > delegateEnd) return flash("시작일이 종료일보다 이후입니다");
    if (delegateTo === userName) return flash("본인에게 위임할 수 없습니다");

    const s = sb();
    if (!s) return;
    const key = `approval_delegation_${userName}`;
    const value: DelegationData = {
      delegate: delegateTo,
      start: delegateStart,
      end: delegateEnd,
      reason: delegateReason,
      active: true,
    };

    // upsert: key가 이미 있으면 update, 없으면 insert
    const { data: existing } = await s.from("hq_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await s.from("hq_settings").update({ value: JSON.stringify(value) }).eq("key", key);
    } else {
      await s.from("hq_settings").insert({ key, value: JSON.stringify(value) });
    }

    flash(`${delegateTo}님에게 결재 위임이 설정되었습니다`);
    setDelegateTo("");
    setDelegateEnd("");
    setDelegateReason("");
    loadDelegations();
  };

  const revokeDelegation = async (owner: string) => {
    const s = sb();
    if (!s) return;
    const key = `approval_delegation_${owner}`;
    const { data: existing } = await s.from("hq_settings").select("id, value").eq("key", key).maybeSingle();
    if (existing) {
      const val: DelegationData = typeof existing.value === "string" ? JSON.parse(existing.value) : existing.value;
      val.active = false;
      await s.from("hq_settings").update({ value: JSON.stringify(val) }).eq("key", key);
    }
    flash("위임이 해제되었습니다");
    loadDelegations();
  };

  const submit = async () => {
    if (!title.trim()) return flash("제목을 입력하세요");
    if (approvalLine.length === 0) return flash("결재선을 설정하세요 (결재자를 1명 이상 추가)");
    const s = sb();
    if (!s) return;

    // 양식 템플릿이 선택된 경우 내용 자동 생성
    let finalContent = content;
    if (selectedTemplate !== "자유양식") {
      finalContent = buildTemplateContent(selectedTemplate, templateFields);
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (file) {
      const path = `approvals/${Date.now()}_${file.name}`;
      const { error: ue } = await s.storage.from("hq-files").upload(path, file);
      if (!ue) {
        const { data: { publicUrl } } = s.storage.from("hq-files").getPublicUrl(path);
        fileUrl = publicUrl;
        fileName = file.name;
      }
    }

    const approverValue = approvalLine.length === 1 ? approvalLine[0] : JSON.stringify(approvalLine);

    const { error } = await s.from("hq_approvals").insert({
      title: title.trim(), content: finalContent.trim(),
      author: userName, approver: approverValue,
      status: "대기",
      file_url: fileUrl || null, file_name: fileName || null,
      urgent: urgent,
      approved_steps: "0",
    });
    if (error) return flash("저장 실패: " + error.message);
    flash("결재가 요청되었습니다");
    setTitle(""); setContent(""); setSelectedApprover(""); setFile(null); setUrgent(false);
    setApproverSearch(""); setApprovalLine([]);
    setSelectedTemplate("자유양식"); setTemplateFields({});
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const act = async (id: string, status: "승인" | "반려", actingFor?: string) => {
    const s = sb();
    if (!s) return;
    const item = list.find(a => a.id === id);
    if (!item) return;

    const line = parseApprovalLine(item.approver);
    const currentStep = parseApprovedSteps(item);

    const delegateComment = actingFor
      ? `[위임결재: ${actingFor} -> ${userName}] ${comment.trim() || ""}`
      : comment.trim() || null;

    if (status === "반려") {
      // 반려 시 즉시 반려 처리
      await s.from("hq_approvals").update({
        status: "반려",
        comment: delegateComment,
        approved_at: new Date().toISOString(),
        approved_steps: String(currentStep),
      }).eq("id", id);
      flash("반려되었습니다");
    } else {
      // 승인: 다음 단계로 진행
      const nextStep = currentStep + 1;
      const isLastStep = nextStep >= line.length;
      await s.from("hq_approvals").update({
        status: isLastStep ? "승인" : "대기",
        comment: delegateComment,
        approved_at: isLastStep ? new Date().toISOString() : null,
        approved_steps: String(nextStep),
      }).eq("id", id);
      if (isLastStep) {
        flash("최종 승인되었습니다");
      } else {
        flash(`${currentStep + 1}단계 승인 완료 — 다음 결재자: ${line[nextStep]}`);
      }
    }
    setComment("");
    load();
  };

  const delApproval = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_approvals").delete().eq("id", id);
    flash("삭제되었습니다");
    load();
  };

  const filtered = list.filter(a => {
    const line = parseApprovalLine(a.approver);
    const isInLine = line.includes(userName);
    const isMyTurn = currentApproverName(a) === userName;
    const isDelegatedToMe = canActAsDelegateFor(a) !== null;
    if (filter === "mine") return a.author === userName || isInLine || isDelegatedToMe;
    if (filter === "pending") return a.status === "대기" && (isMyTurn || isDelegatedToMe);
    return true;
  });

  const pendingCount = list.filter(a => {
    if (a.status !== "대기") return false;
    return currentApproverName(a) === userName || canActAsDelegateFor(a) !== null;
  }).length;

  function seqLabel(seq: number) {
    return `결재-${String(seq).padStart(3, "0")}`;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // ── 조직도 결재선 필터 ─────────────────────────────
  const filteredOrgMembers = allTeamMembers.filter(m =>
    m.name !== userName &&
    !approvalLine.includes(m.name) &&
    (!orgSearch || m.name.includes(orgSearch) || m.hqRole.includes(orgSearch))
  );

  const ROLE_ORDER: Record<string, number> = { "대표": 0, "이사": 1, "팀장": 2, "팀원": 3 };
  const sortedOrgMembers = [...filteredOrgMembers].sort((a, b) =>
    (ROLE_ORDER[a.hqRole] ?? 4) - (ROLE_ORDER[b.hqRole] ?? 4)
  );

  // ── 활성 위임 목록 (표시용) ────────────────────────
  const activeDelegations = delegations.filter(d => d.data.active);

  return (
    <div className="space-y-6">
      {/* 결재 위임 설정 - 팀장 이상만 */}
      {canApprove && (
        <div className={C}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">결재 위임 설정</h3>
            <button className={B2} onClick={() => setShowDelegation(!showDelegation)}>
              {showDelegation ? "닫기" : "위임 설정"}
            </button>
          </div>

          {/* 활성 위임 목록 */}
          {activeDelegations.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-slate-500">활성 위임 현황</p>
              {activeDelegations.map(d => {
                const isExpired = d.data.end < today();
                return (
                  <div key={d.owner} className={`flex items-center justify-between p-3 rounded-xl border ${isExpired ? "border-slate-200 bg-slate-50/50" : "border-blue-200 bg-blue-50/50"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`${BADGE} ${isExpired ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                        {isExpired ? "만료" : "활성"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {displayName(d.owner)} &rarr; {displayName(d.data.delegate)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {d.data.start} ~ {d.data.end}
                          {d.data.reason && <span className="ml-2">({d.data.reason})</span>}
                        </p>
                      </div>
                    </div>
                    {d.owner === userName && (
                      <button
                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        onClick={() => revokeDelegation(d.owner)}
                      >
                        해제
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showDelegation && (
            <div className="space-y-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
              <div>
                <label className={L}>위임 대상자</label>
                <select className={I} value={delegateTo} onChange={e => setDelegateTo(e.target.value)}>
                  <option value="">선택하세요</option>
                  {allTeamMembers.filter(m => m.name !== userName).map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.hqRole})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={L}>시작일</label>
                  <input type="date" className={I} value={delegateStart} onChange={e => setDelegateStart(e.target.value)} />
                </div>
                <div>
                  <label className={L}>종료일</label>
                  <input type="date" className={I} value={delegateEnd} onChange={e => setDelegateEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={L}>위임 사유</label>
                <input className={I} placeholder="출장, 휴가 등" value={delegateReason} onChange={e => setDelegateReason(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <button className={B} onClick={saveDelegation}>위임 저장</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 결재 요청 폼 */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">결재 요청</h3>
        <div className="space-y-4">
          {/* 양식 선택 */}
          <div>
            <label className={L}>양식 선택</label>
            <select
              className={I}
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value as TemplateType)}
            >
              {TEMPLATE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={L}>제목</label>
            <input className={I} placeholder="결재 제목" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* 결재선 설정 - 기존 검색 + 조직도 결재선 */}
          <div>
            <label className={L}>결재선 설정 (순서대로 결재자를 추가하세요)</label>
            {/* 현재 결재선 - 드래그 가능 */}
            {approvalLine.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mb-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {approvalLine.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-0.5"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                  >
                    {idx > 0 && <span className="text-slate-300 text-xs mx-1">&rarr;</span>}
                    <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#3182F6]/30 hover:shadow-md transition-all">
                      <span className="text-[10px] text-slate-400 mr-0.5">{idx + 1}단계</span>
                      {name}
                      <button type="button" onClick={() => moveApprovalLine(idx, "up")} className="text-slate-300 hover:text-slate-500 ml-0.5" title="위로" disabled={idx === 0}>&uarr;</button>
                      <button type="button" onClick={() => moveApprovalLine(idx, "down")} className="text-slate-300 hover:text-slate-500" title="아래로" disabled={idx === approvalLine.length - 1}>&darr;</button>
                      <button type="button" onClick={() => removeFromApprovalLine(idx)} className="text-slate-300 hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* 결재자 검색/추가 */}
            <div className="relative">
              <input className={I} placeholder="결재자 이름으로 검색하여 추가..." value={approverSearch}
                onChange={e => { setApproverSearch(e.target.value); setShowApproverList(true); }}
                onFocus={() => setShowApproverList(true)} />
              {showApproverList && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {approvers.filter(a => !approverSearch || a.name.includes(approverSearch)).filter(a => !approvalLine.includes(a.name)).length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">검색 결과 없음</p>
                  ) : (
                    approvers.filter(a => !approverSearch || a.name.includes(approverSearch)).filter(a => !approvalLine.includes(a.name)).map(a => (
                      <button key={a.name} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                        onClick={() => addToApprovalLine(a.name)}>
                        <span className="font-medium text-slate-700">{a.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{a.hqRole}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* 조직도 결재선 버튼 */}
            <button type="button" className={`${B2} mt-2 text-sm`} onClick={() => setShowOrgChart(!showOrgChart)}>
              {showOrgChart ? "조직도 닫기" : "조직도에서 결재선 추가"}
            </button>
          </div>

          {/* 조직도 결재선 패널 */}
          {showOrgChart && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">조직도 결재선</p>
                <input className={`${I} !w-48 !py-1.5 !text-xs`}
                  placeholder="이름/직급 검색..."
                  value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {sortedOrgMembers.map(m => {
                  const roleColor = m.hqRole === "대표" ? "bg-red-50 text-red-700 border-red-200" :
                    m.hqRole === "이사" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    m.hqRole === "팀장" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-slate-50 text-slate-600 border-slate-200";
                  return (
                    <button key={m.name} type="button"
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${roleColor} hover:shadow-md transition-all active:scale-95`}
                      onClick={() => addToApprovalLine(m.name)}>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                        {m.name.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold">{m.name}</span>
                      <span className="text-[10px] opacity-70">{m.hqRole}</span>
                    </button>
                  );
                })}
                {sortedOrgMembers.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400 text-center py-4">추가할 수 있는 팀원이 없습니다</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className={L}>보고자</label>
            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">{userName} ({myRole})</div>
          </div>

          {/* 양식 템플릿 필드 or 자유 입력 */}
          {selectedTemplate === "자유양식" ? (
            <div>
              <label className={L}>내용</label>
              <textarea
                className={`${I} min-h-[100px] resize-y`}
                placeholder="결재 내용을 작성하세요"
                value={content} onChange={e => setContent(e.target.value)} rows={4}
              />
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className={`${BADGE} bg-[#3182F6]/10 text-[#3182F6]`}>{selectedTemplate}</span>
                양식 입력
              </p>
              {TEMPLATE_FIELDS[selectedTemplate]?.map(field => (
                <div key={field.key}>
                  <label className={L}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      className={`${I} min-h-[80px] resize-y`}
                      placeholder={field.placeholder || ""}
                      value={templateFields[field.key] || ""}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      rows={3}
                    />
                  ) : field.type === "select" ? (
                    <select
                      className={I}
                      value={templateFields[field.key] || ""}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                    >
                      <option value="">선택하세요</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "date" ? (
                    <input
                      type="date"
                      className={I}
                      value={templateFields[field.key] || ""}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                    />
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      className={I}
                      placeholder={field.placeholder || ""}
                      value={templateFields[field.key] || ""}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className={I}
                      placeholder={field.placeholder || ""}
                      value={templateFields[field.key] || ""}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={L}>첨부파일</label>
            <input ref={fileRef} type="file"
              className="text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="rounded border-red-300 text-red-500 focus:ring-red-300"
              />
              <span className="text-red-500 font-semibold">긴급 결재</span>
            </label>
            <button className={B} onClick={submit}>결재 요청</button>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 items-center">
        {[
          { key: "all" as const, label: "전체" },
          { key: "mine" as const, label: "내 결재" },
          { key: "pending" as const, label: `승인 대기 ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              filter === f.key ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 결재 목록 */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">결재 목록</h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">결재 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const line = parseApprovalLine(a.approver);
              const approvedSteps = parseApprovedSteps(a);
              const currentApprover = currentApproverName(a);
              const isMyTurn = currentApprover === userName;
              const delegatedFrom = canActAsDelegateFor(a);
              const canActOnThis = isMyTurn || delegatedFrom !== null;
              const isInLine = line.includes(userName);
              const isAuthor = a.author === userName;
              const isExpanded = expandedApproval === a.id;
              const isMultiStep = line.length > 1;

              // 위임 표시 정보
              const currentApproverDelegate = currentApprover ? getActiveDelegateFor(currentApprover) : null;

              return (
                <div key={a.id} className={`rounded-xl border p-4 hover:bg-slate-50/60 transition-colors ${a.urgent ? "border-red-300 border-l-4 bg-red-50/20" : "border-slate-100"}`}>
                  <div
                    className="flex items-start justify-between gap-3 mb-2 cursor-pointer"
                    onClick={() => setExpandedApproval(isExpanded ? null : a.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                          {seqLabel(a.seq ?? 0)}
                        </span>
                        {a.urgent && (
                          <span className={`${BADGE} text-[10px] bg-red-500 text-white`}>긴급</span>
                        )}
                        <span className="text-sm font-bold text-slate-800">{a.title}</span>
                        <span className={`${BADGE} ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                        {isMultiStep && a.status === "대기" && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                            {approvedSteps}/{line.length}단계
                          </span>
                        )}
                        {canActOnThis && a.status === "대기" && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">결재 필요</span>
                        )}
                        {/* 위임 배지 */}
                        {currentApproverDelegate && a.status === "대기" && (
                          <span className={`${BADGE} text-[10px] bg-purple-100 text-purple-700`}>
                            위임: {displayName(currentApprover!)} &rarr; {displayName(currentApproverDelegate)}
                          </span>
                        )}
                      </div>
                      {/* 결재선 시각화 */}
                      {isMultiStep ? (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-xs text-slate-400">보고자: <span className="text-slate-600 font-medium">{displayName(a.author)}</span></span>
                          <span className="text-slate-300 text-xs mx-0.5">&rarr;</span>
                          {line.map((name, idx) => {
                            const isDone = a.status !== "반려" && idx < approvedSteps;
                            const isCurrent = a.status === "대기" && idx === approvedSteps;
                            const isRejectedAt = a.status === "반려" && idx === approvedSteps;
                            return (
                              <span key={idx} className="flex items-center gap-0.5">
                                {idx > 0 && <span className="text-slate-300 text-[10px] mx-0.5">&rarr;</span>}
                                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                                  isDone ? "bg-emerald-50 text-emerald-700" :
                                  isCurrent ? "bg-amber-50 text-amber-700 ring-1 ring-amber-300" :
                                  isRejectedAt ? "bg-red-50 text-red-700 ring-1 ring-red-300" :
                                  "bg-slate-50 text-slate-400"
                                }`}>
                                  {isDone ? "\u2713 " : isCurrent ? "\u25B6 " : isRejectedAt ? "\u2717 " : ""}{displayName(name)}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          보고자: <span className="text-slate-600 font-medium">{displayName(a.author)}</span> &rarr; 결재자: <span className="text-slate-600 font-medium">{displayName(line[0])}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAuthor && a.status === "대기" && (
                        <button onClick={(e) => { e.stopPropagation(); delApproval(a.id); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">취소</button>
                      )}
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                      {a.content && <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>}

                      {a.fileUrl && (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#3182F6] hover:underline">
                          📎 {a.fileName || "첨부파일"}
                        </a>
                      )}

                      {a.comment && (
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                          💬 <span className="font-semibold">{displayName(a.approver)}:</span> {a.comment}
                        </p>
                      )}

                      {/* 다단계 결재 진행 현황 */}
                      {isMultiStep && (
                        <div className="bg-slate-50/80 rounded-xl p-3">
                          <p className="text-xs font-semibold text-slate-500 mb-3">결재선 진행 현황</p>
                          <div className="flex items-center gap-0 overflow-x-auto pb-1">
                            {line.map((name, idx) => {
                              const isDone = a.status !== "반려" && idx < approvedSteps;
                              const isCurrent = a.status === "대기" && idx === approvedSteps;
                              const isRejectedAt = a.status === "반려" && idx === approvedSteps;
                              const delegateForStep = getActiveDelegateFor(name);
                              return (
                                <div key={idx} className="flex items-center">
                                  {idx > 0 && (
                                    <div className={`w-6 h-0.5 ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
                                  )}
                                  <div className={`flex flex-col items-center min-w-[60px] ${isCurrent ? "scale-110" : ""}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isDone ? "bg-emerald-500 text-white" :
                                      isCurrent ? "bg-amber-400 text-white ring-2 ring-amber-200" :
                                      isRejectedAt ? "bg-red-500 text-white" :
                                      "bg-slate-200 text-slate-400"
                                    }`}>
                                      {isDone ? "\u2713" : isRejectedAt ? "\u2717" : idx + 1}
                                    </div>
                                    <p className={`text-[10px] mt-1 font-medium ${
                                      isDone ? "text-emerald-600" :
                                      isCurrent ? "text-amber-600" :
                                      isRejectedAt ? "text-red-600" :
                                      "text-slate-400"
                                    }`}>{displayName(name)}</p>
                                    {isCurrent && delegateForStep && (
                                      <p className="text-[10px] text-purple-500 font-medium">
                                        (위임: {displayName(delegateForStep)})
                                      </p>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                      {isDone ? "승인 완료" : isCurrent ? "결재 대기" : isRejectedAt ? "반려" : "대기"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Timeline / History */}
                      <div className="bg-slate-50/80 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2">결재 이력</p>
                        <div className="space-y-2">
                          {/* Submitted */}
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#3182F6] mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">{displayName(a.author)}</span>이(가) 결재를 요청했습니다
                                {isMultiStep && <span className="text-slate-400"> (결재선: {line.map(n => displayName(n)).join(" → ")})</span>}
                              </p>
                              <p className="text-[10px] text-slate-400">{formatDateTime(a.date)}</p>
                            </div>
                          </div>

                          {/* 다단계: 각 승인 완료 단계 표시 */}
                          {isMultiStep && line.slice(0, approvedSteps).map((name, idx) => (
                            <div key={`step-${idx}`} className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-600">
                                  <span className="font-semibold">{displayName(name)}</span>이(가){" "}
                                  <span className="text-emerald-600 font-semibold">{idx + 1}단계 승인</span>했습니다
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* 단일 결재자 또는 최종 완료/반려 */}
                          {!isMultiStep && a.status !== "대기" && (
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === "승인" ? "bg-emerald-500" : "bg-red-500"}`} />
                              <div>
                                <p className="text-xs text-slate-600">
                                  <span className="font-semibold">{displayName(line[0])}</span>이(가){" "}
                                  <span className={a.status === "승인" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                                    {a.status}
                                  </span>
                                  했습니다
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {a.approved_at ? formatDateTime(a.approved_at) : "-"}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 다단계 반려 표시 */}
                          {isMultiStep && a.status === "반려" && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-600">
                                  <span className="font-semibold">{displayName(line[approvedSteps] || line[line.length - 1])}</span>이(가){" "}
                                  <span className="text-red-600 font-semibold">{approvedSteps + 1}단계에서 반려</span>했습니다
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 다단계 최종 승인 표시 */}
                          {isMultiStep && a.status === "승인" && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-600">
                                  <span className="text-emerald-600 font-bold">최종 승인</span> 완료
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {a.approved_at ? formatDateTime(a.approved_at) : "-"}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Pending indicator */}
                          {a.status === "대기" && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 animate-pulse" />
                              <p className="text-xs text-amber-600">
                                <span className="font-semibold">{displayName(currentApprover || line[0])}</span>의 결재를 대기 중입니다...
                                {isMultiStep && ` (${approvedSteps + 1}/${line.length}단계)`}
                                {currentApproverDelegate && (
                                  <span className="text-purple-500 ml-1">
                                    (위임: {displayName(currentApprover!)} &rarr; {displayName(currentApproverDelegate)})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 현재 결재 순서의 결재자 또는 위임받은 사람만 승인/반려 가능 */}
                      {a.status === "대기" && canActOnThis && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          {delegatedFrom && (
                            <span className={`${BADGE} text-[10px] bg-purple-100 text-purple-700 flex-shrink-0`}>
                              위임: {displayName(delegatedFrom)} &rarr; {userName}
                            </span>
                          )}
                          <input className={`${I} !text-xs flex-1`} placeholder="코멘트 (선택)"
                            value={comment} onChange={e => setComment(e.target.value)} />
                          <button className="rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2 text-xs hover:bg-emerald-600 transition-colors"
                            onClick={() => act(a.id, "승인", delegatedFrom || undefined)}>승인</button>
                          <button className="rounded-xl bg-red-500 text-white font-semibold px-4 py-2 text-xs hover:bg-red-600 transition-colors"
                            onClick={() => act(a.id, "반려", delegatedFrom || undefined)}>반려</button>
                        </div>
                      )}

                      {/* PDF 다운로드 */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <button
                          className="rounded-xl bg-slate-100 text-slate-700 font-semibold px-4 py-2 text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                          onClick={(e) => { e.stopPropagation(); openPrintableApproval(a); }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          PDF 다운로드
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
