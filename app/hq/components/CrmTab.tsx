"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type Company = {
  id: string; name: string; industry: string; contact_person: string;
  phone: string; email: string; address: string; notes: string;
  grade: string; author: string; created_at: string;
};
type Deal = {
  id: string; title: string; company_id: string; amount: number;
  stage: string; probability: number; expected_close: string;
  author: string; created_at: string;
};
type Activity = {
  id: string; company_id: string; type: string; content: string;
  author: string; date: string; created_at: string;
};

type SubTab = "companies" | "deals" | "pipeline";

const GRADES = ["VIP", "일반", "잠재"] as const;
const STAGES = ["발굴", "제안", "협상", "계약", "완료", "실패"] as const;
const ACT_TYPES = ["전화", "미팅", "이메일", "메모"] as const;

const GRADE_COLORS: Record<string, string> = {
  "VIP": "bg-amber-50 text-amber-700", "일반": "bg-blue-50 text-blue-700", "잠재": "bg-slate-100 text-slate-600",
};
const STAGE_COLORS: Record<string, string> = {
  "발굴": "bg-slate-100 text-slate-600", "제안": "bg-blue-50 text-blue-700",
  "협상": "bg-amber-50 text-amber-700", "계약": "bg-indigo-50 text-indigo-700",
  "완료": "bg-emerald-50 text-emerald-700", "실패": "bg-red-50 text-red-700",
};
const ACT_ICONS: Record<string, string> = { "전화": "📞", "미팅": "🤝", "이메일": "📧", "메모": "📝" };

const COMP_EMPTY = { name: "", industry: "", contact_person: "", phone: "", email: "", address: "", notes: "", grade: "일반" as string };
const DEAL_EMPTY = { title: "", company_id: "", amount: "", stage: "발굴" as string, probability: "30", expected_close: "" };

export default function CrmTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [sub, setSub] = useState<SubTab>("companies");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // company form
  const [showCompForm, setShowCompForm] = useState(false);
  const [compForm, setCompForm] = useState(COMP_EMPTY);
  const [compEditId, setCompEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // deal form
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealForm, setDealForm] = useState(DEAL_EMPTY);
  const [dealEditId, setDealEditId] = useState<string | null>(null);

  // activity form
  const [actCompanyId, setActCompanyId] = useState<string | null>(null);
  const [actType, setActType] = useState<string>("전화");
  const [actContent, setActContent] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("전체");
  const [detailCompId, setDetailCompId] = useState<string | null>(null);

  async function load() {
    const s = sb(); if (!s) { setLoading(false); return; }
    const [r1, r2, r3] = await Promise.all([
      s.from("hq_crm_companies").select("*").order("created_at", { ascending: false }),
      s.from("hq_crm_deals").select("*").order("created_at", { ascending: false }),
      s.from("hq_crm_activities").select("*").order("date", { ascending: false }).limit(300),
    ]);
    if (r1.data) setCompanies(r1.data as Company[]);
    if (r2.data) setDeals(r2.data as Deal[]);
    if (r3.data) setActivities(r3.data as Activity[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── 요약 ─────────────────────────────────────────────
  const pipeline = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== "완료" && d.stage !== "실패");
    const totalValue = activeDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const weightedValue = activeDeals.reduce((s, d) => s + (d.amount || 0) * (d.probability || 0) / 100, 0);
    const stageCounts: Record<string, { count: number; value: number }> = {};
    STAGES.forEach(st => { stageCounts[st] = { count: 0, value: 0 }; });
    deals.forEach(d => { if (stageCounts[d.stage]) { stageCounts[d.stage].count++; stageCounts[d.stage].value += d.amount || 0; } });
    return { totalValue, weightedValue, stageCounts, activeCount: activeDeals.length };
  }, [deals]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (gradeFilter !== "전체" && c.grade !== gradeFilter) return false;
      if (search && !c.name.includes(search) && !c.contact_person?.includes(search) && !c.industry?.includes(search)) return false;
      return true;
    });
  }, [companies, gradeFilter, search]);

  // ── CRUD ─────────────────────────────────────────────
  async function saveCompany() {
    if (!compForm.name.trim()) { flash("회사명을 입력해주세요"); return; }
    setSaving(true);
    const s = sb(); if (!s) { setSaving(false); return; }
    const payload = { ...compForm, name: compForm.name.trim(), author: userName };
    if (compEditId) {
      await s.from("hq_crm_companies").update(payload).eq("id", compEditId);
      flash("거래처가 수정되었습니다");
    } else {
      await s.from("hq_crm_companies").insert(payload);
      flash("거래처가 등록되었습니다");
    }
    setShowCompForm(false); setCompForm(COMP_EMPTY); setCompEditId(null); setSaving(false); load();
  }

  async function deleteCompany(id: string) {
    if (!confirm("이 거래처를 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_crm_companies").delete().eq("id", id);
    flash("삭제되었습니다"); load();
  }

  async function saveDeal() {
    if (!dealForm.title.trim() || !dealForm.company_id) { flash("제목과 거래처를 선택해주세요"); return; }
    setSaving(true);
    const s = sb(); if (!s) { setSaving(false); return; }
    const payload = {
      title: dealForm.title.trim(), company_id: dealForm.company_id,
      amount: Number(dealForm.amount) || 0, stage: dealForm.stage,
      probability: Number(dealForm.probability) || 0, expected_close: dealForm.expected_close || null,
      author: userName,
    };
    if (dealEditId) {
      await s.from("hq_crm_deals").update(payload).eq("id", dealEditId);
      flash("딜이 수정되었습니다");
    } else {
      await s.from("hq_crm_deals").insert(payload);
      flash("딜이 등록되었습니다");
    }
    setShowDealForm(false); setDealForm(DEAL_EMPTY); setDealEditId(null); setSaving(false); load();
  }

  async function deleteDeal(id: string) {
    if (!confirm("이 딜을 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_crm_deals").delete().eq("id", id);
    flash("삭제되었습니다"); load();
  }

  async function submitActivity() {
    if (!actCompanyId || !actContent.trim()) { flash("내용을 입력해주세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_crm_activities").insert({
      company_id: actCompanyId, type: actType, content: actContent.trim(), author: userName, date: today(),
    });
    flash("활동이 기록되었습니다"); setActCompanyId(null); setActContent(""); load();
  }

  const detailComp = detailCompId ? companies.find(c => c.id === detailCompId) : null;
  const detailDeals = detailCompId ? deals.filter(d => d.company_id === detailCompId) : [];
  const detailActs = detailCompId ? activities.filter(a => a.company_id === detailCompId) : [];
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || "-";

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "거래처", value: `${companies.length}곳` },
          { label: "진행중 딜", value: `${pipeline.activeCount}건` },
          { label: "파이프라인 총액", value: `${fmt(pipeline.totalValue)}원` },
          { label: "기대 매출(가중)", value: `${fmt(Math.round(pipeline.weightedValue))}원` },
        ].map(c => (
          <div key={c.label} className={C}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className="text-lg font-bold text-slate-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* 서브 탭 */}
      <div className="flex gap-2">
        {([["companies", "거래처"], ["deals", "딜 관리"], ["pipeline", "파이프라인"]] as [SubTab, string][]).map(([k, l]) => (
          <button key={k} className={sub === k ? B : B2} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {/* ── 거래처 상세 ──────────────────────────── */}
      {detailComp && (
        <div className={C}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{detailComp.name} <span className={`${BADGE} ${GRADE_COLORS[detailComp.grade] || ""} ml-2`}>{detailComp.grade}</span></h3>
              <p className="text-sm text-slate-500">{detailComp.industry || ""} · {detailComp.contact_person || ""}</p>
            </div>
            <button className={B2} onClick={() => setDetailCompId(null)}>닫기</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
            <div><span className="text-slate-400">전화</span><br/>{detailComp.phone || "-"}</div>
            <div><span className="text-slate-400">이메일</span><br/>{detailComp.email || "-"}</div>
            <div><span className="text-slate-400">주소</span><br/>{detailComp.address || "-"}</div>
          </div>
          {detailComp.notes && <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-xl p-3">{detailComp.notes}</p>}

          {/* 딜 */}
          <h4 className="font-semibold text-slate-700 mb-2">관련 딜 ({detailDeals.length}건)</h4>
          {detailDeals.length > 0 && (
            <div className="space-y-2 mb-4">
              {detailDeals.map(d => (
                <div key={d.id} className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2">
                  <span className="font-medium text-slate-800">{d.title}</span>
                  <span className={`${BADGE} ${STAGE_COLORS[d.stage] || ""}`}>{d.stage}</span>
                  <span className="text-slate-500">{fmt(d.amount || 0)}원</span>
                  <span className="text-slate-400">{d.probability}%</span>
                </div>
              ))}
            </div>
          )}

          {/* 활동 기록 */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-slate-700">활동 기록</h4>
            <button className="text-xs text-[#3182F6] hover:underline" onClick={() => { setActCompanyId(detailComp.id); setActType("전화"); }}>+ 추가</button>
          </div>
          {actCompanyId === detailComp.id && (
            <div className="flex flex-wrap gap-2 mb-3 items-end">
              <select className={`${I} max-w-[100px]`} value={actType} onChange={e => setActType(e.target.value)}>
                {ACT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input className={`${I} flex-1`} placeholder="내용" value={actContent} onChange={e => setActContent(e.target.value)} />
              <button className={B} onClick={submitActivity}>저장</button>
              <button className={B2} onClick={() => setActCompanyId(null)}>취소</button>
            </div>
          )}
          {detailActs.length === 0 ? <p className="text-sm text-slate-400">활동 기록이 없습니다</p> : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {detailActs.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm border-b border-slate-100 pb-2">
                  <span>{ACT_ICONS[a.type] || "📌"}</span>
                  <div className="flex-1">
                    <span className="text-slate-700">{a.content}</span>
                    <div className="text-xs text-slate-400">{a.date} · {displayName(a.author)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 거래처 탭 ──────────────────────────── */}
      {sub === "companies" && (
        <>
          <div className={`${C} flex flex-wrap gap-3 items-center`}>
            <input className={`${I} max-w-[220px]`} placeholder="검색 (회사/담당자/업종)" value={search} onChange={e => setSearch(e.target.value)} />
            <select className={`${I} max-w-[120px]`} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="전체">등급 전체</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <div className="flex-1" />
            <button className={B} onClick={() => { setCompForm(COMP_EMPTY); setCompEditId(null); setShowCompForm(true); }}>+ 거래처 등록</button>
          </div>

          {showCompForm && (
            <div className={C}>
              <h3 className="font-bold text-slate-800 mb-4">{compEditId ? "거래처 수정" : "거래처 등록"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={L}>회사명 *</label><input className={I} value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} /></div>
                <div><label className={L}>업종</label><input className={I} value={compForm.industry} onChange={e => setCompForm({ ...compForm, industry: e.target.value })} /></div>
                <div><label className={L}>담당자</label><input className={I} value={compForm.contact_person} onChange={e => setCompForm({ ...compForm, contact_person: e.target.value })} /></div>
                <div><label className={L}>전화번호</label><input className={I} value={compForm.phone} onChange={e => setCompForm({ ...compForm, phone: e.target.value })} /></div>
                <div><label className={L}>이메일</label><input className={I} value={compForm.email} onChange={e => setCompForm({ ...compForm, email: e.target.value })} /></div>
                <div><label className={L}>등급</label>
                  <select className={I} value={compForm.grade} onChange={e => setCompForm({ ...compForm, grade: e.target.value })}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2"><label className={L}>주소</label><input className={I} value={compForm.address} onChange={e => setCompForm({ ...compForm, address: e.target.value })} /></div>
                <div className="md:col-span-2"><label className={L}>메모</label><textarea className={`${I} min-h-[60px]`} value={compForm.notes} onChange={e => setCompForm({ ...compForm, notes: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className={B} onClick={saveCompany} disabled={saving}>{saving ? "저장중..." : compEditId ? "수정" : "등록"}</button>
                <button className={B2} onClick={() => { setShowCompForm(false); setCompEditId(null); }}>취소</button>
              </div>
            </div>
          )}

          <div className={C}>
            <h3 className="font-bold text-slate-800 mb-3">거래처 목록 ({filteredCompanies.length}곳)</h3>
            {filteredCompanies.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">등록된 거래처가 없습니다</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 font-medium">회사명</th><th className="pb-2 font-medium">업종</th>
                    <th className="pb-2 font-medium">담당자</th><th className="pb-2 font-medium">등급</th>
                    <th className="pb-2 font-medium">전화</th><th className="pb-2 font-medium"></th>
                  </tr></thead>
                  <tbody>
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-medium text-slate-800 cursor-pointer hover:text-[#3182F6]" onClick={() => setDetailCompId(c.id)}>{c.name}</td>
                        <td className="text-slate-500">{c.industry || "-"}</td>
                        <td className="text-slate-600">{c.contact_person || "-"}</td>
                        <td><span className={`${BADGE} ${GRADE_COLORS[c.grade] || ""}`}>{c.grade}</span></td>
                        <td className="text-slate-500">{c.phone || "-"}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="text-xs text-slate-400 hover:underline" onClick={() => { setCompForm({ name: c.name, industry: c.industry || "", contact_person: c.contact_person || "", phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "", grade: c.grade }); setCompEditId(c.id); setShowCompForm(true); }}>수정</button>
                            <button className="text-xs text-red-400 hover:underline" onClick={() => deleteCompany(c.id)}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 딜 관리 탭 ─────────────────────────── */}
      {sub === "deals" && (
        <>
          <div className={`${C} flex justify-between items-center`}>
            <h3 className="font-bold text-slate-800">딜 목록 ({deals.length}건)</h3>
            <button className={B} onClick={() => { setDealForm(DEAL_EMPTY); setDealEditId(null); setShowDealForm(true); }}>+ 딜 등록</button>
          </div>

          {showDealForm && (
            <div className={C}>
              <h3 className="font-bold text-slate-800 mb-4">{dealEditId ? "딜 수정" : "딜 등록"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={L}>제목 *</label><input className={I} value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} /></div>
                <div><label className={L}>거래처 *</label>
                  <select className={I} value={dealForm.company_id} onChange={e => setDealForm({ ...dealForm, company_id: e.target.value })}>
                    <option value="">선택</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className={L}>금액 (원)</label><input type="number" className={I} value={dealForm.amount} onChange={e => setDealForm({ ...dealForm, amount: e.target.value })} /></div>
                <div><label className={L}>단계</label>
                  <select className={I} value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={L}>확률 (%)</label><input type="number" min="0" max="100" className={I} value={dealForm.probability} onChange={e => setDealForm({ ...dealForm, probability: e.target.value })} /></div>
                <div><label className={L}>예상 마감일</label><input type="date" className={I} value={dealForm.expected_close} onChange={e => setDealForm({ ...dealForm, expected_close: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className={B} onClick={saveDeal} disabled={saving}>{saving ? "저장중..." : dealEditId ? "수정" : "등록"}</button>
                <button className={B2} onClick={() => { setShowDealForm(false); setDealEditId(null); }}>취소</button>
              </div>
            </div>
          )}

          <div className={C}>
            {deals.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">등록된 딜이 없습니다</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 font-medium">제목</th><th className="pb-2 font-medium">거래처</th>
                    <th className="pb-2 font-medium">금액</th><th className="pb-2 font-medium">단계</th>
                    <th className="pb-2 font-medium">확률</th><th className="pb-2 font-medium">마감</th><th className="pb-2 font-medium"></th>
                  </tr></thead>
                  <tbody>
                    {deals.map(d => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-medium text-slate-800">{d.title}</td>
                        <td className="text-slate-600">{companyName(d.company_id)}</td>
                        <td className="text-slate-600">{fmt(d.amount || 0)}원</td>
                        <td><span className={`${BADGE} ${STAGE_COLORS[d.stage] || ""}`}>{d.stage}</span></td>
                        <td className="text-slate-500">{d.probability}%</td>
                        <td className="text-slate-400">{d.expected_close || "-"}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="text-xs text-slate-400 hover:underline" onClick={() => { setDealForm({ title: d.title, company_id: d.company_id, amount: String(d.amount || ""), stage: d.stage, probability: String(d.probability || ""), expected_close: d.expected_close || "" }); setDealEditId(d.id); setShowDealForm(true); }}>수정</button>
                            <button className="text-xs text-red-400 hover:underline" onClick={() => deleteDeal(d.id)}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 파이프라인 탭 ──────────────────────── */}
      {sub === "pipeline" && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-4">파이프라인 현황</h3>
          <div className="space-y-3">
            {STAGES.map(stage => {
              const info = pipeline.stageCounts[stage];
              const maxVal = Math.max(...Object.values(pipeline.stageCounts).map(v => v.value), 1);
              const pct = info.value / maxVal * 100;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{stage} <span className="text-slate-400">({info.count}건)</span></span>
                    <span className="text-slate-600">{fmt(info.value)}원</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${stage === "완료" ? "bg-emerald-400" : stage === "실패" ? "bg-red-400" : "bg-[#3182F6]"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* 파이프라인 딜 목록 */}
          <div className="mt-6 space-y-2">
            {STAGES.filter(st => pipeline.stageCounts[st].count > 0).map(stage => (
              <div key={stage}>
                <h4 className="text-sm font-semibold text-slate-600 mb-1">{stage}</h4>
                {deals.filter(d => d.stage === stage).map(d => (
                  <div key={d.id} className="flex items-center gap-3 text-sm pl-3 py-1 border-l-2 border-slate-200">
                    <span className="font-medium text-slate-700">{d.title}</span>
                    <span className="text-slate-400">{companyName(d.company_id)}</span>
                    <span className="text-slate-500 ml-auto">{fmt(d.amount || 0)}원</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
