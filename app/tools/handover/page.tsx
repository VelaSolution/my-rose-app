"use client";

import Link from "next/link";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import ToolNav from "@/components/ToolNav";

const SECTIONS = [
  {
    title: "계약 관련",
    items: [
      "임대차 계약서 원본 확인",
      "임대차 잔여 기간 확인",
      "보증금 / 월세 금액 확인",
      "권리금 계약서 작성",
      "영업 양도양수 계약서 작성",
      "기존 대출 / 채무 확인",
      "관리비 정산 확인",
    ],
  },
  {
    title: "인허가 / 행정",
    items: [
      "사업자등록증 변경 (세무서)",
      "영업신고증 변경 (구청)",
      "식품위생교육 이수",
      "소방안전관리자 지정",
      "간판 변경 신고 (필요 시)",
      "카드 가맹 재등록",
      "배달앱 사업자 변경",
    ],
  },
  {
    title: "시설 / 장비",
    items: [
      "주방 설비 작동 상태 확인",
      "냉장고 / 냉동고 상태 확인",
      "에어컨 / 난방 작동 확인",
      "간판 / 조명 상태 확인",
      "테이블 / 의자 수량 확인",
      "POS 시스템 인수인계",
      "CCTV 작동 및 녹화 확인",
      "전기 / 가스 / 수도 명의 변경",
    ],
  },
  {
    title: "운영 / 재고",
    items: [
      "기존 레시피 인수",
      "식재료 재고 확인 / 정산",
      "거래처 목록 인수 (식자재, 주류 등)",
      "직원 고용 승계 여부 확인",
      "기존 예약 / 고객 DB 인수",
      "포인트 / 쿠폰 처리 방안",
      "네이버 플레이스 관리 권한 이전",
      "SNS 계정 인수 여부",
    ],
  },
  {
    title: "재무 / 세금",
    items: [
      "최근 6개월 매출 자료 확인",
      "부가세 신고 내역 확인",
      "미납 세금 유무 확인",
      "카드매출 정산 계좌 변경",
      "공과금 미납 확인",
      "세무사 선임 / 변경",
    ],
  },
];

type CheckState = Record<string, boolean>;

export default function HandoverPage() {
  const { data: checks, update: setChecks, status, userId } = useCloudSync<CheckState>("vela-handover-checklist", {});
  const total = SECTIONS.reduce((a, s) => a + s.items.length, 0);
  const done = Object.values(checks).filter(Boolean).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = (key: string) => {
    setChecks({ ...checks, [key]: !checks[key] });
  };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-3xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>🔄</span> 인수인계
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">매장 인수인계 체크리스트</h1>
            <CloudSyncBadge status={status} userId={userId} />
          </div>
          <p className="text-slate-500 text-sm">매장 양도양수 시 빠뜨리면 안 되는 항목들을 체크하세요.</p>
        </div>

        {/* 진행률 */}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-900">진행률</span>
            <span className="text-sm font-bold text-blue-600">{done}/{total} ({progress}%)</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionDone = section.items.filter((item) => checks[item]).length;
            return (
              <div key={section.title} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                  <span className="text-xs text-slate-400">{sectionDone}/{section.items.length}</span>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <label key={item} className="flex items-center gap-3 py-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!checks[item]}
                        onChange={() => toggle(item)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm transition ${checks[item] ? "text-slate-400 line-through" : "text-slate-700 group-hover:text-slate-900"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => { setChecks({}); }} className="mt-6 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-400 hover:text-red-500 hover:border-red-200 transition">초기화</button>
      </div>
    </main>
    </>
  );
}
