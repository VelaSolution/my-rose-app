"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import { useSimulatorData } from "@/lib/useSimulatorData";
import CloudSyncBadge from "@/components/CloudSyncBadge";

const TABS = ["급여 계산기", "근로계약서", "채용공고", "노동법 상식"] as const;
type Tab = (typeof TABS)[number];
const KEY = "vela-hiring";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const MIN_WAGE = 9860; // 2024 최저시급

type Employee = { id: number; name: string; type: "정규직" | "시급제" | "일급제"; hourlyWage: number; weeklyHours: number; weeklyDays: number; nightHours: number };
const defaultEmp: Employee = { id: 1, name: "직원 1", type: "시급제", hourlyWage: MIN_WAGE, weeklyHours: 40, weeklyDays: 5, nightHours: 0 };

interface ContractForm {
  bizName: string; bizNo: string; ceoName: string; bizAddr: string;
  empName: string; empBirth: string; empAddr: string;
  startDate: string; contractType: "정규직" | "기간제"; endDate: string;
  workStart: string; workEnd: string; breakTime: number;
  workDays: boolean[]; // 월~일
  wageType: "시급" | "월급"; wageAmount: number; payDay: number;
}

const defaultContract: ContractForm = {
  bizName: "", bizNo: "", ceoName: "", bizAddr: "",
  empName: "", empBirth: "", empAddr: "",
  startDate: "", contractType: "정규직", endDate: "",
  workStart: "09:00", workEnd: "18:00", breakTime: 60,
  workDays: [true, true, true, true, true, false, false],
  wageType: "시급", wageAmount: MIN_WAGE, payDay: 10,
};

const POSITIONS: Record<string, string[]> = {
  cafe: ["바리스타", "홀 서빙", "주방 보조", "매니저"],
  restaurant: ["홀 서빙", "주방 보조", "주방장", "매니저", "배달"],
  bar: ["바텐더", "홀 서빙", "주방 보조", "매니저"],
  finedining: ["소믈리에", "홀 서빙", "주방 보조", "수셰프", "헤드셰프", "매니저"],
  gogi: ["홀 서빙", "주방 보조", "고기 써는 사람", "매니저"],
};

const LABOR_LAWS = [
  { title: "최저임금 (2024)", content: "시급 9,860원, 월 환산 2,060,740원 (주 40시간 기준, 주휴수당 포함). 수습 3개월간 10% 감액 가능 (1년 이상 계약 시).", penalty: "3년 이하 징역 또는 2천만원 이하 벌금", tip: "시급을 표시할 때 주휴수당이 포함된 금액인지 반드시 명시하세요." },
  { title: "근로시간", content: "법정 주 40시간, 1일 8시간. 연장근로 주 12시간 한도 (합의 시). 연장·야간·휴일근로는 통상임금의 50% 가산.", penalty: "2년 이하 징역 또는 2천만원 이하 벌금", tip: "5인 미만 사업장은 연장·야간·휴일수당 가산 의무 없음." },
  { title: "휴게시간", content: "근로시간 4시간당 30분, 8시간당 1시간 이상. 근로자가 자유롭게 이용 가능해야 함.", penalty: "2년 이하 징역 또는 1천만원 이하 벌금", tip: "휴게시간은 근로시간에 포함되지 않으므로 급여 계산 시 제외." },
  { title: "주휴일·주휴수당", content: "주 15시간 이상 근무 시 유급 주휴일 1일 부여. 주휴수당 = 1일 통상임금. 결근 없이 소정근로일 개근 필요.", penalty: "미지급 시 임금체불 (3년 이하 징역 또는 3천만원 이하 벌금)", tip: "시급제 아르바이트도 주 15시간 이상이면 주휴수당 필수!" },
  { title: "연차유급휴가", content: "1년 미만: 1개월 개근 시 1일. 1년 이상: 15일 (2년마다 1일 추가, 최대 25일). 미사용 연차는 수당으로 지급.", penalty: "미부여 시 2년 이하 징역 또는 2천만원 이하 벌금", tip: "5인 미만 사업장도 연차 부여 의무 있음 (근로기준법 개정)." },
  { title: "퇴직급여", content: "1년 이상 계속 근로 시 30일분 평균임금. 퇴직연금(DB/DC) 또는 퇴직금 형태. 퇴직 후 14일 이내 지급.", penalty: "3년 이하 징역 또는 3천만원 이하 벌금", tip: "인건비 산정 시 월급의 1/12을 퇴직금 충당금으로 계산하세요." },
  { title: "해고 예고", content: "30일 전 해고 예고 또는 30일분 통상임금 지급. 정당한 해고 사유 필요 (5인 이상 사업장).", penalty: "부당해고 시 노동위원회 구제신청 대상", tip: "5인 미만 사업장은 해고 사유 제한·예고 의무 없으나, 해고예고수당은 지급 권장." },
  { title: "5인 미만 사업장 특례", content: "적용 제외: 부당해고 구제, 연장·야간·휴일 가산수당, 생리휴가, 경영상 해고 제한. 적용: 최저임금, 주휴수당, 연차, 퇴직급여, 4대보험.", penalty: "-", tip: "직원 수는 상시근로자 기준. 일용직·단시간 포함 여부 주의." },
  { title: "외국인 근로자 고용", content: "E-9 비자(비전문취업): 고용허가제 → 고용센터 신청. 내국인 구인 노력 14일 이상 필요. 최저임금 이상, 4대보험 적용.", penalty: "불법고용 시 5년 이하 징역 또는 3천만원 이하 벌금", tip: "고용센터(고용노동부)에서 외국인력 도입 절차 안내받으세요." },
  { title: "산재보험·근로자 보호", content: "모든 근로자(일용직 포함) 산재보험 적용. 업무상 재해 시 치료비·휴업급여·장해급여 지급. 사업주 전액 부담.", penalty: "미가입 시 보험급여의 50% 징수", tip: "주방 화상, 미끄러짐 등 외식업 산재 사고 빈번. 안전교육 필수." },
];

export default function HiringPage() {
  const [tab, setTab] = useState<Tab>("급여 계산기");
  const [employees, setEmployees] = useState<Employee[]>([{ ...defaultEmp }]);
  const [contract, setContract] = useState<ContractForm>(defaultContract);
  const [jobIndustry, setJobIndustry] = useState("restaurant");
  const [jobPosition, setJobPosition] = useState("홀 서빙");
  const [jobLocation, setJobLocation] = useState("");
  const [jobWage, setJobWage] = useState("시급 10,000원");
  const [jobHours, setJobHours] = useState("10:00~15:00");
  const [jobBenefits, setJobBenefits] = useState("식사 제공, 교통비 지원");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: hiringData, update: setHiringData, status, userId } = useCloudSync<{ employees: Employee[]; contract: ContractForm }>(KEY, { employees: [{ ...defaultEmp }], contract: defaultContract });
  const simData = useSimulatorData();

  // Cloud sync로 employees/contract 동기화
  useEffect(() => { setEmployees(hiringData.employees); setContract(hiringData.contract); }, [hiringData]);
  const syncEmployees = (emps: Employee[]) => { setEmployees(emps); setHiringData({ ...hiringData, employees: emps }); };
  const syncContract = (c: ContractForm) => { setContract(c); setHiringData({ ...hiringData, contract: c }); };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  /* 급여 계산 */
  const calcEmployee = (emp: Employee) => {
    const monthlyHours = emp.weeklyHours / emp.weeklyDays * (365.25 / 12 / 7) * emp.weeklyDays; // ≒ 주급기준
    const basePay = emp.type === "정규직" ? emp.hourlyWage : Math.round(emp.hourlyWage * 209);
    const weeklyPay = emp.weeklyHours >= 15 ? Math.round(emp.hourlyWage * (emp.weeklyHours / emp.weeklyDays)) : 0; // 주휴수당
    const monthlyWeekly = Math.round(weeklyPay * 4.345);
    const nightPay = Math.round(emp.nightHours * emp.hourlyWage * 0.5 * 4.345);
    const overtime = emp.weeklyHours > 40 ? Math.round((emp.weeklyHours - 40) * emp.hourlyWage * 1.5 * 4.345) : 0;
    const grossPay = (emp.type === "정규직" ? basePay : Math.round(emp.hourlyWage * 209)) + nightPay + overtime;
    const empInsurance = Math.round(grossPay * 0.09399); // 근로자 부담 4대보험
    const employerInsurance = Math.round(grossPay * 0.10399); // 사업주 부담
    const retirement = Math.round(grossPay / 12); // 퇴직금 충당
    const totalCost = grossPay + employerInsurance + retirement;
    const netPay = grossPay - empInsurance - Math.round(grossPay * 0.01); // 간이 소득세
    return { basePay: emp.type === "정규직" ? basePay : Math.round(emp.hourlyWage * 209), weeklyPay: monthlyWeekly, nightPay, overtime, grossPay, empInsurance, employerInsurance, retirement, totalCost, netPay };
  };

  const totalCost = employees.reduce((s, e) => s + calcEmployee(e).totalCost, 0);

  /* 근로계약서 텍스트 */
  const buildContract = () => {
    const c = contract;
    const days = ["월", "화", "수", "목", "금", "토", "일"];
    const workDayStr = days.filter((_, i) => c.workDays[i]).join(", ");
    return `
━━━ 표준 근로계약서 ━━━

1. 사업장 정보
   사업장명: ${c.bizName}
   사업자등록번호: ${c.bizNo}
   대표자: ${c.ceoName}
   주소: ${c.bizAddr}

2. 근로자 정보
   성명: ${c.empName}
   생년월일: ${c.empBirth}
   주소: ${c.empAddr}

3. 근로계약기간
   시작일: ${c.startDate}
   계약유형: ${c.contractType}${c.contractType === "기간제" ? ` (종료일: ${c.endDate})` : ""}

4. 근무시간
   근무시간: ${c.workStart} ~ ${c.workEnd}
   휴게시간: ${c.breakTime}분
   근무요일: ${workDayStr}

5. 임금
   ${c.wageType}: ${fmt(c.wageAmount)}원
   지급일: 매월 ${c.payDay}일

6. 사회보험
   국민연금, 건강보험, 고용보험, 산재보험 적용

7. 기타
   - 연차유급휴가: 근로기준법에 따름
   - 퇴직급여: 1년 이상 계속근로 시 지급
   - 이 계약에 명시되지 않은 사항은 근로기준법에 따름

위 내용으로 근로계약을 체결하고, 본 계약서 2통을 작성하여 각 1통씩 보관한다.

20    년    월    일

(사업주) ${c.ceoName}  (서명)
(근로자) ${c.empName}  (서명)
`.trim();
  };

  /* 채용공고 생성 */
  const buildJobPost = (style: "short" | "detail" | "sns") => {
    const pos = jobPosition;
    if (style === "short") return `[${jobIndustry === "cafe" ? "카페" : "음식점"}] ${pos} 구합니다\n\n📍 ${jobLocation}\n💰 ${jobWage}\n⏰ ${jobHours}\n🎁 ${jobBenefits}\n\n관심 있으신 분 연락주세요!`;
    if (style === "detail") return `━ ${pos} 모집 공고 ━\n\n■ 모집 포지션: ${pos}\n■ 근무지: ${jobLocation}\n■ 급여: ${jobWage}\n■ 근무시간: ${jobHours}\n■ 복리후생: ${jobBenefits}\n\n■ 담당 업무\n- ${pos} 관련 전반 업무\n- 매장 청결 및 위생 관리\n- 고객 응대 및 서비스\n\n■ 자격 요건\n- 성별/학력 무관\n- 관련 경험자 우대\n- 성실하고 책임감 있는 분\n\n■ 지원 방법\n- 전화 또는 문자 지원\n- 매장 방문 면접 가능`;
    return `🔥 ${pos} 같이 일해요!\n\n우리 매장에서 함께할 ${pos}을 찾고 있어요 ✨\n\n📍 위치: ${jobLocation}\n💰 급여: ${jobWage}\n⏰ 시간: ${jobHours}\n🎁 혜택: ${jobBenefits}\n\nDM이나 댓글로 연락주세요! 💬`;
  };

  return (
    <>
      <NavBar />
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>👥</span> 인력 채용 도구
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">인력 채용 도구</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">급여 계산, 근로계약서, 채용공고까지 한 번에</p>
              <CloudSyncBadge status={status} userId={userId} />
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* 급여 계산기 */}
          {tab === "급여 계산기" && (
            <>
              <div className="bg-teal-50 rounded-2xl px-4 py-3 mb-4 text-xs text-teal-700">
                💡 2024년 최저시급: <b>{fmt(MIN_WAGE)}원</b> | 월 환산(209h): <b>{fmt(MIN_WAGE * 209)}원</b>
              </div>
              {employees.map((emp, idx) => {
                const calc = calcEmployee(emp);
                return (
                  <div key={emp.id} className={cardCls}>
                    <div className="flex justify-between items-center mb-3">
                      <input className="font-bold text-slate-900 text-sm bg-transparent border-none outline-none" value={emp.name}
                        onChange={e => { const a = [...employees]; a[idx] = { ...a[idx], name: e.target.value }; setEmployees(a); }} />
                      {employees.length > 1 && <button onClick={() => setEmployees(employees.filter((_, i) => i !== idx))} className="text-red-400 text-xs font-semibold">삭제</button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelCls}>고용형태</label>
                        <select className={inputCls} value={emp.type} onChange={e => { const a = [...employees]; a[idx] = { ...a[idx], type: e.target.value as Employee["type"] }; setEmployees(a); }}>
                          <option value="시급제">시급제</option><option value="정규직">월급제 (정규직)</option><option value="일급제">일급제</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{emp.type === "정규직" ? "월급 (원)" : "시급 (원)"}</label>
                        <input className={inputCls} inputMode="numeric" value={emp.hourlyWage || ""}
                          onChange={e => { const a = [...employees]; a[idx] = { ...a[idx], hourlyWage: Number(e.target.value.replace(/[^0-9]/g, "")) }; setEmployees(a); }} />
                      </div>
                      <div>
                        <label className={labelCls}>주 근무시간</label>
                        <input className={inputCls} inputMode="numeric" value={emp.weeklyHours || ""}
                          onChange={e => { const a = [...employees]; a[idx] = { ...a[idx], weeklyHours: Number(e.target.value.replace(/[^0-9]/g, "")) }; setEmployees(a); }} />
                      </div>
                      <div>
                        <label className={labelCls}>주 근무일수</label>
                        <input className={inputCls} inputMode="numeric" value={emp.weeklyDays || ""}
                          onChange={e => { const a = [...employees]; a[idx] = { ...a[idx], weeklyDays: Number(e.target.value.replace(/[^0-9]/g, "")) }; setEmployees(a); }} />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <tbody className="text-slate-700">
                          {([
                            ["월 기본급", calc.basePay],
                            ["주휴수당 (월)", calc.weeklyPay],
                            ["야간수당", calc.nightPay],
                            ["연장수당", calc.overtime],
                          ] as [string, number][]).map(([l, v]) => (
                            <tr key={l} className="border-b border-slate-50">
                              <td className="py-1.5">{l}</td><td className="py-1.5 text-right font-semibold">{fmt(v)}원</td>
                            </tr>
                          ))}
                          <tr className="border-t border-slate-200 font-bold"><td className="py-1.5">총 지급액</td><td className="py-1.5 text-right">{fmt(calc.grossPay)}원</td></tr>
                          <tr className="border-b border-slate-50 text-slate-400"><td className="py-1.5">- 근로자 4대보험</td><td className="py-1.5 text-right">-{fmt(calc.empInsurance)}원</td></tr>
                          <tr className="border-b border-slate-50 text-emerald-600 font-bold"><td className="py-1.5">실수령액</td><td className="py-1.5 text-right">{fmt(calc.netPay)}원</td></tr>
                          <tr className="border-t-2 border-slate-200"><td className="py-1.5 text-slate-400">+ 사업주 4대보험</td><td className="py-1.5 text-right text-slate-400">{fmt(calc.employerInsurance)}원</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1.5 text-slate-400">+ 퇴직금 충당</td><td className="py-1.5 text-right text-slate-400">{fmt(calc.retirement)}원</td></tr>
                          <tr className="font-extrabold text-red-600"><td className="py-1.5">실제 인건비 총액</td><td className="py-1.5 text-right">{fmt(calc.totalCost)}원</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setEmployees([...employees, { ...defaultEmp, id: Date.now(), name: `직원 ${employees.length + 1}` }])}
                className="w-full rounded-xl bg-white ring-1 ring-slate-200 text-slate-500 font-semibold py-3 text-sm hover:bg-slate-50 transition mb-4">+ 직원 추가</button>
              {employees.length > 1 && (
                <div className="bg-slate-900 rounded-2xl px-5 py-4 text-center mb-4">
                  <p className="text-xs text-slate-400 mb-1">전체 인건비 (사업주 부담 총액)</p>
                  <p className="text-2xl font-extrabold text-white">{fmt(totalCost)}원 <span className="text-sm text-slate-400">/월</span></p>
                  <p className="text-xs text-slate-400 mt-1">연간 약 {fmt(totalCost * 12)}원</p>
                </div>
              )}
            </>
          )}

          {/* 근로계약서 */}
          {tab === "근로계약서" && (
            <div className={cardCls}>
              <h3 className="font-bold text-slate-900 text-sm mb-4">📄 근로계약서 생성</h3>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400">사업장 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>사업장명</label><input className={inputCls} value={contract.bizName} onChange={e => setContract({ ...contract, bizName: e.target.value })} /></div>
                  <div><label className={labelCls}>사업자등록번호</label><input className={inputCls} value={contract.bizNo} onChange={e => setContract({ ...contract, bizNo: e.target.value })} placeholder="000-00-00000" /></div>
                  <div><label className={labelCls}>대표자명</label><input className={inputCls} value={contract.ceoName} onChange={e => setContract({ ...contract, ceoName: e.target.value })} /></div>
                  <div><label className={labelCls}>사업장 주소</label><input className={inputCls} value={contract.bizAddr} onChange={e => setContract({ ...contract, bizAddr: e.target.value })} /></div>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">근로자 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>근로자명</label><input className={inputCls} value={contract.empName} onChange={e => setContract({ ...contract, empName: e.target.value })} /></div>
                  <div><label className={labelCls}>생년월일</label><input className={inputCls} value={contract.empBirth} onChange={e => setContract({ ...contract, empBirth: e.target.value })} placeholder="1990-01-01" /></div>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">근무 조건</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>근무 시작일</label><input className={inputCls} type="date" value={contract.startDate} onChange={e => setContract({ ...contract, startDate: e.target.value })} /></div>
                  <div><label className={labelCls}>계약유형</label>
                    <select className={inputCls} value={contract.contractType} onChange={e => setContract({ ...contract, contractType: e.target.value as "정규직" | "기간제" })}>
                      <option value="정규직">정규직</option><option value="기간제">기간제</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>근무시간</label><div className="flex gap-1 items-center"><input className={inputCls} type="time" value={contract.workStart} onChange={e => setContract({ ...contract, workStart: e.target.value })} /><span className="text-xs text-slate-400">~</span><input className={inputCls} type="time" value={contract.workEnd} onChange={e => setContract({ ...contract, workEnd: e.target.value })} /></div></div>
                  <div>
                    <label className={labelCls}>{contract.wageType} (원)</label>
                    <input className={inputCls} inputMode="numeric" value={contract.wageAmount || ""} onChange={e => setContract({ ...contract, wageAmount: Number(e.target.value.replace(/[^0-9]/g, "")) })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>근무요일</label>
                  <div className="flex gap-1">
                    {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
                      <button key={d} onClick={() => { const a = [...contract.workDays]; a[i] = !a[i]; setContract({ ...contract, workDays: a }); }}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold transition ${contract.workDays[i] ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"}`}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(buildContract()); alert("근로계약서가 복사되었습니다!"); }}
                className="mt-4 w-full rounded-xl bg-slate-900 text-white font-semibold py-3 text-sm hover:bg-slate-800 transition">📋 근로계약서 복사하기</button>
            </div>
          )}

          {/* 채용공고 */}
          {tab === "채용공고" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">✏️ 채용 정보 입력</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>업종</label>
                    <select className={inputCls} value={jobIndustry} onChange={e => { setJobIndustry(e.target.value); setJobPosition((POSITIONS[e.target.value] ?? ["홀 서빙"])[0]); }}>
                      <option value="cafe">카페</option><option value="restaurant">음식점</option><option value="bar">술집/바</option>
                      <option value="finedining">파인다이닝</option><option value="gogi">고깃집</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>포지션</label>
                    <select className={inputCls} value={jobPosition} onChange={e => setJobPosition(e.target.value)}>
                      {(POSITIONS[jobIndustry] ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>근무지</label><input className={inputCls} value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="강남역 3번 출구 도보 3분" /></div>
                  <div><label className={labelCls}>급여</label><input className={inputCls} value={jobWage} onChange={e => setJobWage(e.target.value)} /></div>
                  <div><label className={labelCls}>근무시간</label><input className={inputCls} value={jobHours} onChange={e => setJobHours(e.target.value)} /></div>
                  <div><label className={labelCls}>복리후생</label><input className={inputCls} value={jobBenefits} onChange={e => setJobBenefits(e.target.value)} /></div>
                </div>
              </div>
              {([
                ["📱 당근/알바천국 스타일", "short" as const],
                ["📄 상세 공고 스타일", "detail" as const],
                ["✨ SNS 스타일", "sns" as const],
              ] as const).map(([title, style]) => (
                <div key={style} className={cardCls}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                    <button onClick={() => { navigator.clipboard.writeText(buildJobPost(style)); alert("복사 완료!"); }}
                      className="text-xs text-teal-600 font-semibold">📋 복사</button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-xl p-3 font-sans leading-relaxed">{buildJobPost(style)}</pre>
                </div>
              ))}
            </>
          )}

          {/* 노동법 상식 */}
          {tab === "노동법 상식" && (
            <div className="space-y-3">
              {LABOR_LAWS.map((law, i) => (
                <div key={i} className={cardCls}>
                  <button onClick={() => setExpanded(expanded === law.title ? null : law.title)} className="w-full text-left flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 font-extrabold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="font-bold text-sm text-slate-900 flex-1">{law.title}</span>
                    <span className="text-slate-400 text-xs">{expanded === law.title ? "▲" : "▼"}</span>
                  </button>
                  {expanded === law.title && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2">
                      <p className="text-slate-600 leading-relaxed">{law.content}</p>
                      {law.penalty !== "-" && <p className="text-red-500">⚠️ 위반 시: {law.penalty}</p>}
                      <p className="text-teal-600">💡 {law.tip}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
