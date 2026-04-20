"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type Course = {
  id: string; title: string; description: string; instructor: string;
  category: string; duration: string; deadline: string; status: string; created_at: string;
};
type Enrollment = {
  id: string; course_id: string; user_name: string;
  status: "수강중" | "완료" | "미수강"; progress: number; completed_at: string | null;
};

type View = "list" | "detail" | "create" | "history";

const CATEGORIES = ["직무", "리더십", "안전", "IT", "기타"] as const;
const STATUS_COLORS: Record<string, string> = {
  "진행중": "bg-blue-50 text-blue-700",
  "완료": "bg-emerald-50 text-emerald-700",
  "예정": "bg-amber-50 text-amber-700",
};
const ENROLL_COLORS: Record<string, string> = {
  "수강중": "bg-blue-50 text-blue-700",
  "완료": "bg-emerald-50 text-emerald-700",
  "미수강": "bg-slate-100 text-slate-600",
};
const CAT_COLORS: Record<string, string> = {
  "직무": "bg-indigo-50 text-indigo-700",
  "리더십": "bg-purple-50 text-purple-700",
  "안전": "bg-red-50 text-red-700",
  "IT": "bg-cyan-50 text-cyan-700",
  "기타": "bg-slate-100 text-slate-600",
};

const EMPTY_COURSE = { title: "", description: "", instructor: "", category: "직무", duration: "", deadline: today() };

export default function EducationTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const isAdmin = myRole === "대표" || myRole === "이사";
  const [view, setView] = useState<View>("list");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_COURSE);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");

  const load = async () => {
    const s = sb(); if (!s) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: e }] = await Promise.all([
        s.from("hq_courses").select("*").order("created_at", { ascending: false }),
        s.from("hq_enrollments").select("*"),
      ]);
      if (c) setCourses(c.map((d: any) => ({ id: d.id, title: d.title, description: d.description ?? "", instructor: d.instructor ?? "", category: d.category ?? "기타", duration: d.duration ?? "", deadline: d.deadline ?? "", status: d.status ?? "예정", created_at: d.created_at })));
      if (e) setEnrollments(e.map((d: any) => ({ id: d.id, course_id: d.course_id, user_name: d.user_name, status: d.status ?? "미수강", progress: d.progress ?? 0, completed_at: d.completed_at })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredCourses = useMemo(() => courses.filter(c =>
    (catFilter === "전체" || c.category === catFilter) &&
    (statusFilter === "전체" || c.status === statusFilter)
  ), [courses, catFilter, statusFilter]);

  const myEnrollments = useMemo(() => enrollments.filter(e => e.user_name === userName), [enrollments, userName]);
  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedId), [courses, selectedId]);
  const selectedEnrollments = useMemo(() => enrollments.filter(e => e.course_id === selectedId), [enrollments, selectedId]);

  const handleSave = async () => {
    if (!form.title) { flash("과정명을 입력하세요"); return; }
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, instructor: form.instructor, category: form.category, duration: form.duration, deadline: form.deadline, status: "예정" };
      if (editId) {
        const { error } = await s.from("hq_courses").update(payload).eq("id", editId);
        if (error) throw error;
        flash("과정이 수정되었습니다");
      } else {
        const { error } = await s.from("hq_courses").insert(payload);
        if (error) throw error;
        flash("과정이 등록되었습니다");
      }
      setForm(EMPTY_COURSE); setEditId(null); setView("list"); load();
    } catch (e) { flash("저장 실패"); console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("과정을 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_enrollments").delete().eq("course_id", id);
      await s.from("hq_courses").delete().eq("id", id);
      flash("삭제되었습니다"); setView("list"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  const handleEnroll = async (courseId: string) => {
    const exists = enrollments.find(e => e.course_id === courseId && e.user_name === userName);
    if (exists) { flash("이미 수강 신청되어 있습니다"); return; }
    const s = sb(); if (!s) return;
    try {
      const { error } = await s.from("hq_enrollments").insert({ course_id: courseId, user_name: userName, status: "수강중", progress: 0 });
      if (error) throw error;
      flash("수강 신청되었습니다"); load();
    } catch (e) { flash("신청 실패"); }
  };

  const handleUpdateProgress = async (enrollId: string, progress: number) => {
    const s = sb(); if (!s) return;
    const isComplete = progress >= 100;
    try {
      const { error } = await s.from("hq_enrollments").update({
        progress: Math.min(progress, 100),
        status: isComplete ? "완료" : "수강중",
        completed_at: isComplete ? new Date().toISOString() : null,
      }).eq("id", enrollId);
      if (error) throw error;
      flash(isComplete ? "과정을 완료했습니다!" : "진도가 업데이트되었습니다"); load();
    } catch (e) { flash("업데이트 실패"); }
  };

  const handleStatusChange = async (courseId: string, status: string) => {
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_courses").update({ status }).eq("id", courseId);
      flash("상태가 변경되었습니다"); load();
    } catch (e) { flash("변경 실패"); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  // 과정 상세
  if (view === "detail" && selectedCourse) {
    const myEnroll = selectedEnrollments.find(e => e.user_name === userName);
    const completionRate = selectedEnrollments.length > 0 ? Math.round(selectedEnrollments.filter(e => e.status === "완료").length / selectedEnrollments.length * 100) : 0;
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => setView("list")}>← 목록</button>
        <div className={C}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className={`${BADGE} ${CAT_COLORS[selectedCourse.category] ?? "bg-slate-100 text-slate-600"} mr-2`}>{selectedCourse.category}</span>
              <span className={`${BADGE} ${STATUS_COLORS[selectedCourse.status] ?? "bg-slate-100 text-slate-600"}`}>{selectedCourse.status}</span>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <select value={selectedCourse.status} onChange={e => handleStatusChange(selectedCourse.id, e.target.value)} className={`${I} w-28`}>
                  <option value="예정">예정</option>
                  <option value="진행중">진행중</option>
                  <option value="완료">완료</option>
                </select>
                <button className={B2} onClick={() => { setForm({ title: selectedCourse.title, description: selectedCourse.description, instructor: selectedCourse.instructor, category: selectedCourse.category, duration: selectedCourse.duration, deadline: selectedCourse.deadline }); setEditId(selectedCourse.id); setView("create"); }}>수정</button>
                <button className="text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(selectedCourse.id)}>삭제</button>
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedCourse.title}</h2>
          <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{selectedCourse.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-slate-400">강사</span><p className="font-medium text-slate-700">{selectedCourse.instructor || "-"}</p></div>
            <div><span className="text-slate-400">기간</span><p className="font-medium text-slate-700">{selectedCourse.duration || "-"}</p></div>
            <div><span className="text-slate-400">마감일</span><p className="font-medium text-slate-700">{selectedCourse.deadline || "-"}</p></div>
            <div><span className="text-slate-400">수강자</span><p className="font-medium text-slate-700">{fmt(selectedEnrollments.length)}명</p></div>
          </div>
        </div>

        {/* 수강 신청 / 진도 */}
        <div className={C}>
          {!myEnroll ? (
            <button className={B} onClick={() => handleEnroll(selectedCourse.id)}>수강 신청</button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">내 진도율</span>
                <span className={`${BADGE} ${ENROLL_COLORS[myEnroll.status]}`}>{myEnroll.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${myEnroll.progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{myEnroll.progress}%</span>
              </div>
              {myEnroll.status !== "완료" && (
                <div className="flex gap-2 mt-3">
                  {[25, 50, 75, 100].map(p => (
                    <button key={p} className={B2} onClick={() => handleUpdateProgress(myEnroll.id, p)}>{p}%</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 수강자 목록 (관리자) */}
        {isAdmin && selectedEnrollments.length > 0 && (
          <div className={C}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">수강자 현황</h3>
              <span className="text-sm text-slate-400">완료율 {completionRate}%</span>
            </div>
            <div className="space-y-2">
              {selectedEnrollments.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{displayName(e.user_name)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3182F6] rounded-full" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">{e.progress}%</span>
                    <span className={`${BADGE} ${ENROLL_COLORS[e.status]}`}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 과정 등록/수정 폼
  if (view === "create") {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("list"); setEditId(null); setForm(EMPTY_COURSE); }}>← 목록</button>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{editId ? "과정 수정" : "과정 등록"}</h3>
          <div className="space-y-3">
            <div><label className={L}>과정명</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={I} placeholder="과정명을 입력하세요" /></div>
            <div><label className={L}>설명</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${I} h-28`} placeholder="과정 설명" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>강사</label><input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} className={I} /></div>
              <div>
                <label className={L}>카테고리</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={I}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>기간/시간</label><input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className={I} placeholder="예: 4시간, 2주" /></div>
              <div><label className={L}>수강 마감일</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className={I} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className={B} onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : editId ? "수정" : "등록"}</button>
              <button className={B2} onClick={() => { setView("list"); setEditId(null); setForm(EMPTY_COURSE); }}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 내 학습 이력
  if (view === "history") {
    const myCourses = myEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      return { ...e, course };
    }).filter(e => e.course);
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => setView("list")}>← 목록</button>
        <h2 className="text-lg font-bold text-slate-800">내 학습 이력</h2>
        {myCourses.length === 0 && <p className="text-sm text-slate-400">수강 이력이 없습니다</p>}
        <div className="space-y-3">
          {myCourses.map(e => (
            <div key={e.id} className={`${C} cursor-pointer`} onClick={() => { setSelectedId(e.course_id); setView("detail"); }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`${BADGE} ${CAT_COLORS[e.course!.category] ?? "bg-slate-100 text-slate-600"} mr-2`}>{e.course!.category}</span>
                  <span className="font-semibold text-slate-800">{e.course!.title}</span>
                </div>
                <span className={`${BADGE} ${ENROLL_COLORS[e.status]}`}>{e.status}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#3182F6] rounded-full" style={{ width: `${e.progress}%` }} />
                </div>
                <span className="text-xs text-slate-500">{e.progress}%</span>
              </div>
              {e.completed_at && <p className="text-xs text-slate-400 mt-1">완료일: {e.completed_at.slice(0, 10)}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 과정 목록 (기본 뷰)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">교육/이러닝</h2>
        <div className="flex gap-2">
          <button className={B2} onClick={() => setView("history")}>내 학습 이력</button>
          {isAdmin && <button className={B} onClick={() => { setForm(EMPTY_COURSE); setEditId(null); setView("create"); }}>+ 과정 등록</button>}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "전체 과정", value: courses.length, color: "text-slate-700" },
          { label: "진행중", value: courses.filter(c => c.status === "진행중").length, color: "text-blue-600" },
          { label: "내 수강", value: myEnrollments.length, color: "text-purple-600" },
          { label: "완료", value: myEnrollments.filter(e => e.status === "완료").length, color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className={C}>
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={`${I} w-32`}>
          <option value="전체">전체 카테고리</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${I} w-28`}>
          <option value="전체">전체 상태</option>
          <option value="진행중">진행중</option>
          <option value="예정">예정</option>
          <option value="완료">완료</option>
        </select>
      </div>

      {/* 과정 리스트 */}
      <div className="space-y-3">
        {filteredCourses.length === 0 && <p className="text-sm text-slate-400">등록된 과정이 없습니다</p>}
        {filteredCourses.map(c => {
          const cEnrolls = enrollments.filter(e => e.course_id === c.id);
          const completeCount = cEnrolls.filter(e => e.status === "완료").length;
          return (
            <div key={c.id} className={`${C} cursor-pointer`} onClick={() => { setSelectedId(c.id); setView("detail"); }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`${BADGE} ${CAT_COLORS[c.category] ?? "bg-slate-100 text-slate-600"}`}>{c.category}</span>
                  <span className={`${BADGE} ${STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                </div>
                <span className="text-xs text-slate-400">{c.deadline && `마감: ${c.deadline}`}</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{c.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                {c.instructor && <span>강사: {c.instructor}</span>}
                {c.duration && <span>기간: {c.duration}</span>}
                <span>수강자: {cEnrolls.length}명</span>
                {cEnrolls.length > 0 && <span>완료: {completeCount}명 ({Math.round(completeCount / cEnrolls.length * 100)}%)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
