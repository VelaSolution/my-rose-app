"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type JobPosting = {
  id: string; title: string; department: string; type: string;
  description: string; requirements: string; deadline: string; status: string; author: string;
};
type Applicant = {
  id: string; posting_id: string; name: string; email: string; phone: string;
  resume_url: string; stage: string; notes: string; applied_at: string;
};

type View = "list" | "create" | "detail" | "applicant-form";

const JOB_TYPES = ["정규직", "계약직", "인턴"] as const;
const STAGES = ["서류검토", "1차면접", "2차면접", "최종합격", "불합격"] as const;
const STATUS_COLORS: Record<string, string> = {
  "모집중": "bg-blue-50 text-blue-700",
  "진행중": "bg-amber-50 text-amber-700",
  "마감": "bg-slate-100 text-slate-600",
};
const STAGE_COLORS: Record<string, string> = {
  "서류검토": "bg-slate-100 text-slate-600",
  "1차면접": "bg-blue-50 text-blue-700",
  "2차면접": "bg-purple-50 text-purple-700",
  "최종합격": "bg-emerald-50 text-emerald-700",
  "불합격": "bg-red-50 text-red-700",
};
const TYPE_COLORS: Record<string, string> = {
  "정규직": "bg-indigo-50 text-indigo-700",
  "계약직": "bg-amber-50 text-amber-700",
  "인턴": "bg-cyan-50 text-cyan-700",
};

const EMPTY_POSTING = { title: "", department: "", type: "정규직" as string, description: "", requirements: "", deadline: today() };
const EMPTY_APPLICANT = { name: "", email: "", phone: "", resume_url: "", stage: "서류검토" as string, notes: "" };

export default function RecruitTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const canAccess = myRole === "대표" || myRole === "이사" || myRole === "팀장";
  const isAdmin = myRole === "대표" || myRole === "이사";
  const [view, setView] = useState<View>("list");
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState(EMPTY_POSTING);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [appForm, setAppForm] = useState(EMPTY_APPLICANT);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  if (!canAccess) return (
    <div className="text-center py-20">
      <p className="text-slate-400 text-sm">접근 권한이 없습니다</p>
      <p className="text-slate-300 text-xs mt-1">대표, 이사, 팀장만 이용할 수 있습니다</p>
    </div>
  );

  const load = async () => {
    const s = sb(); if (!s) return;
    setLoading(true);
    try {
      const [{ data: p }, { data: a }] = await Promise.all([
        s.from("hq_job_postings").select("*").order("created_at", { ascending: false }),
        s.from("hq_applicants").select("*").order("applied_at", { ascending: false }),
      ]);
      if (p) setPostings(p.map((d: any) => ({ id: d.id, title: d.title, department: d.department ?? "", type: d.type ?? "정규직", description: d.description ?? "", requirements: d.requirements ?? "", deadline: d.deadline ?? "", status: d.status ?? "모집중", author: d.author ?? "" })));
      if (a) setApplicants(a.map((d: any) => ({ id: d.id, posting_id: d.posting_id, name: d.name, email: d.email ?? "", phone: d.phone ?? "", resume_url: d.resume_url ?? "", stage: d.stage ?? "서류검토", notes: d.notes ?? "", applied_at: d.applied_at ?? "" })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredPostings = useMemo(() => postings.filter(p => statusFilter === "전체" || p.status === statusFilter), [postings, statusFilter]);
  const selectedPosting = useMemo(() => postings.find(p => p.id === selectedId), [postings, selectedId]);
  const selectedApplicants = useMemo(() => applicants.filter(a => a.posting_id === selectedId), [applicants, selectedId]);

  const handleSavePosting = async () => {
    if (!postForm.title) { flash("공고 제목을 입력하세요"); return; }
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const payload = { title: postForm.title, department: postForm.department, type: postForm.type, description: postForm.description, requirements: postForm.requirements, deadline: postForm.deadline, status: "모집중", author: userName };
      if (editPostId) {
        const { error } = await s.from("hq_job_postings").update(payload).eq("id", editPostId);
        if (error) throw error;
        flash("수정되었습니다");
      } else {
        const { error } = await s.from("hq_job_postings").insert(payload);
        if (error) throw error;
        flash("공고가 등록되었습니다");
      }
      setPostForm(EMPTY_POSTING); setEditPostId(null); setView("list"); load();
    } catch (e) { flash("저장 실패"); console.error(e); }
    setSaving(false);
  };

  const handleDeletePosting = async (id: string) => {
    if (!confirm("공고를 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_applicants").delete().eq("posting_id", id);
      await s.from("hq_job_postings").delete().eq("id", id);
      flash("삭제되었습니다"); setView("list"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  const handlePostingStatus = async (id: string, status: string) => {
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_job_postings").update({ status }).eq("id", id);
      flash("상태가 변경되었습니다"); load();
    } catch (e) { flash("변경 실패"); }
  };

  const handleSaveApplicant = async () => {
    if (!appForm.name) { flash("지원자 이름을 입력하세요"); return; }
    if (!selectedId) return;
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const payload = { posting_id: selectedId, name: appForm.name, email: appForm.email, phone: appForm.phone, resume_url: appForm.resume_url, stage: appForm.stage, notes: appForm.notes, applied_at: today() };
      if (editAppId) {
        const { error } = await s.from("hq_applicants").update(payload).eq("id", editAppId);
        if (error) throw error;
        flash("수정되었습니다");
      } else {
        const { error } = await s.from("hq_applicants").insert(payload);
        if (error) throw error;
        flash("지원자가 등록되었습니다");
      }
      setAppForm(EMPTY_APPLICANT); setEditAppId(null); setView("detail"); load();
    } catch (e) { flash("저장 실패"); console.error(e); }
    setSaving(false);
  };

  const handleStageChange = async (appId: string, stage: string) => {
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_applicants").update({ stage }).eq("id", appId);
      flash(`단계 변경: ${stage}`); load();
    } catch (e) { flash("변경 실패"); }
  };

  const handleDeleteApplicant = async (id: string) => {
    if (!confirm("지원자를 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_applicants").delete().eq("id", id);
      flash("삭제되었습니다"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  // 공고 등록/수정
  if (view === "create") {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("list"); setEditPostId(null); setPostForm(EMPTY_POSTING); }}>← 목록</button>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{editPostId ? "공고 수정" : "공고 등록"}</h3>
          <div className="space-y-3">
            <div><label className={L}>공고 제목</label><input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className={I} placeholder="채용 공고 제목" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>부서</label><input value={postForm.department} onChange={e => setPostForm({ ...postForm, department: e.target.value })} className={I} placeholder="부서명" /></div>
              <div>
                <label className={L}>채용 유형</label>
                <select value={postForm.type} onChange={e => setPostForm({ ...postForm, type: e.target.value })} className={I}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><label className={L}>직무 설명</label><textarea value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })} className={`${I} h-24`} placeholder="직무 내용을 설명하세요" /></div>
            <div><label className={L}>자격 요건</label><textarea value={postForm.requirements} onChange={e => setPostForm({ ...postForm, requirements: e.target.value })} className={`${I} h-20`} placeholder="필요 자격, 우대 사항 등" /></div>
            <div><label className={L}>마감일</label><input type="date" value={postForm.deadline} onChange={e => setPostForm({ ...postForm, deadline: e.target.value })} className={I} /></div>
            <div className="flex gap-2 pt-2">
              <button className={B} onClick={handleSavePosting} disabled={saving}>{saving ? "저장 중..." : editPostId ? "수정" : "등록"}</button>
              <button className={B2} onClick={() => { setView("list"); setEditPostId(null); setPostForm(EMPTY_POSTING); }}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 지원자 등록/수정
  if (view === "applicant-form") {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("detail"); setEditAppId(null); setAppForm(EMPTY_APPLICANT); }}>← 돌아가기</button>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{editAppId ? "지원자 수정" : "지원자 등록"}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>이름</label><input value={appForm.name} onChange={e => setAppForm({ ...appForm, name: e.target.value })} className={I} /></div>
              <div><label className={L}>이메일</label><input type="email" value={appForm.email} onChange={e => setAppForm({ ...appForm, email: e.target.value })} className={I} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>전화번호</label><input value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} className={I} placeholder="010-0000-0000" /></div>
              <div>
                <label className={L}>채용 단계</label>
                <select value={appForm.stage} onChange={e => setAppForm({ ...appForm, stage: e.target.value })} className={I}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div><label className={L}>이력서 URL</label><input value={appForm.resume_url} onChange={e => setAppForm({ ...appForm, resume_url: e.target.value })} className={I} placeholder="https://..." /></div>
            <div><label className={L}>메모</label><textarea value={appForm.notes} onChange={e => setAppForm({ ...appForm, notes: e.target.value })} className={`${I} h-20`} placeholder="면접 메모, 특이사항 등" /></div>
            <div className="flex gap-2 pt-2">
              <button className={B} onClick={handleSaveApplicant} disabled={saving}>{saving ? "저장 중..." : editAppId ? "수정" : "등록"}</button>
              <button className={B2} onClick={() => { setView("detail"); setEditAppId(null); setAppForm(EMPTY_APPLICANT); }}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 공고 상세 + 지원자 관리
  if (view === "detail" && selectedPosting) {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("list"); setSelectedId(null); }}>← 공고 목록</button>

        {/* 공고 정보 */}
        <div className={C}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-2">
              <span className={`${BADGE} ${STATUS_COLORS[selectedPosting.status] ?? "bg-slate-100 text-slate-600"}`}>{selectedPosting.status}</span>
              <span className={`${BADGE} ${TYPE_COLORS[selectedPosting.type] ?? "bg-slate-100 text-slate-600"}`}>{selectedPosting.type}</span>
            </div>
            <div className="flex gap-2">
              <select value={selectedPosting.status} onChange={e => handlePostingStatus(selectedPosting.id, e.target.value)} className={`${I} w-28`}>
                <option value="모집중">모집중</option>
                <option value="진행중">진행중</option>
                <option value="마감">마감</option>
              </select>
              <button className={B2} onClick={() => { setPostForm({ title: selectedPosting.title, department: selectedPosting.department, type: selectedPosting.type, description: selectedPosting.description, requirements: selectedPosting.requirements, deadline: selectedPosting.deadline }); setEditPostId(selectedPosting.id); setView("create"); }}>수정</button>
              <button className="text-xs text-red-500 hover:text-red-700" onClick={() => handleDeletePosting(selectedPosting.id)}>삭제</button>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">{selectedPosting.title}</h2>
          <p className="text-sm text-slate-400 mb-3">{selectedPosting.department} · 마감: {selectedPosting.deadline} · 등록: {displayName(selectedPosting.author)}</p>
          <div className="space-y-2 text-sm text-slate-600">
            <div><span className="font-medium text-slate-500">직무 설명:</span><p className="whitespace-pre-wrap mt-1">{selectedPosting.description}</p></div>
            <div><span className="font-medium text-slate-500">자격 요건:</span><p className="whitespace-pre-wrap mt-1">{selectedPosting.requirements}</p></div>
          </div>
        </div>

        {/* 지원자 관리 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">지원자 ({selectedApplicants.length}명)</h3>
          <div className="flex gap-2">
            <button className={viewMode === "list" ? B : B2} onClick={() => setViewMode("list")}>목록</button>
            <button className={viewMode === "kanban" ? B : B2} onClick={() => setViewMode("kanban")}>파이프라인</button>
            <button className={B} onClick={() => { setAppForm(EMPTY_APPLICANT); setEditAppId(null); setView("applicant-form"); }}>+ 지원자 등록</button>
          </div>
        </div>

        {/* 칸반 뷰 */}
        {viewMode === "kanban" ? (
          <div className="grid grid-cols-5 gap-3 overflow-x-auto">
            {STAGES.map(stage => {
              const stageApps = selectedApplicants.filter(a => a.stage === stage);
              return (
                <div key={stage} className="min-w-[180px]">
                  <div className={`${BADGE} ${STAGE_COLORS[stage]} mb-2 w-full justify-center`}>{stage} ({stageApps.length})</div>
                  <div className="space-y-2">
                    {stageApps.map(a => (
                      <div key={a.id} className={`${C} !p-3`}>
                        <p className="font-semibold text-sm text-slate-800">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                        <p className="text-xs text-slate-400">{a.phone}</p>
                        {a.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.notes}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {STAGES.filter(s => s !== stage).map(s => (
                            <button key={s} className="text-[10px] text-[#3182F6] hover:underline" onClick={() => handleStageChange(a.id, s)}>{s}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedApplicants.length === 0 && <p className="text-sm text-slate-400">등록된 지원자가 없습니다</p>}
            {selectedApplicants.map(a => (
              <div key={a.id} className={`${C} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`${BADGE} ${STAGE_COLORS[a.stage] ?? "bg-slate-100 text-slate-600"}`}>{a.stage}</span>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.email} · {a.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.resume_url && <a href={a.resume_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3182F6] hover:underline">이력서</a>}
                  <select value={a.stage} onChange={e => handleStageChange(a.id, e.target.value)} className={`${I} w-28 text-xs py-1`}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="text-xs text-blue-500 hover:text-blue-700" onClick={() => { setAppForm({ name: a.name, email: a.email, phone: a.phone, resume_url: a.resume_url, stage: a.stage, notes: a.notes }); setEditAppId(a.id); setView("applicant-form"); }}>수정</button>
                  <button className="text-xs text-red-400 hover:text-red-600" onClick={() => handleDeleteApplicant(a.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 요약 */}
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map(stage => {
            const count = selectedApplicants.filter(a => a.stage === stage).length;
            return (
              <div key={stage} className={C}>
                <p className="text-xs text-slate-400">{stage}</p>
                <p className="text-xl font-bold text-slate-700">{count}명</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 공고 목록 (기본 뷰)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">채용관리</h2>
        <button className={B} onClick={() => { setPostForm(EMPTY_POSTING); setEditPostId(null); setView("create"); }}>+ 공고 등록</button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "전체 공고", value: postings.length, color: "text-slate-700" },
          { label: "모집중", value: postings.filter(p => p.status === "모집중").length, color: "text-blue-600" },
          { label: "전체 지원자", value: applicants.length, color: "text-purple-600" },
          { label: "최종합격", value: applicants.filter(a => a.stage === "최종합격").length, color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className={C}>
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${I} w-28`}>
          <option value="전체">전체</option>
          <option value="모집중">모집중</option>
          <option value="진행중">진행중</option>
          <option value="마감">마감</option>
        </select>
      </div>

      {/* 공고 리스트 */}
      <div className="space-y-3">
        {filteredPostings.length === 0 && <p className="text-sm text-slate-400">등록된 공고가 없습니다</p>}
        {filteredPostings.map(p => {
          const pApps = applicants.filter(a => a.posting_id === p.id);
          return (
            <div key={p.id} className={`${C} cursor-pointer`} onClick={() => { setSelectedId(p.id); setView("detail"); }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                  <span className={`${BADGE} ${STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                  <span className={`${BADGE} ${TYPE_COLORS[p.type] ?? "bg-slate-100 text-slate-600"}`}>{p.type}</span>
                </div>
                <span className="text-xs text-slate-400">마감: {p.deadline}</span>
              </div>
              <h3 className="font-semibold text-slate-800">{p.title}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{p.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span>{p.department}</span>
                <span>지원자 {pApps.length}명</span>
                <span>등록: {displayName(p.author)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
