"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

type KanbanCard = {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  deadline: string;
  description: string;
  labels: string[];
  status: string;
  goal_id: string | null;
};

type Column = {
  id: string;
  title: string;
  statusKey: string;
  cards: KanbanCard[];
};

const DEFAULT_COLUMNS: { id: string; title: string; statusKey: string }[] = [
  { id: "todo", title: "할 일", statusKey: "pending" },
  { id: "in_progress", title: "진행 중", statusKey: "in_progress" },
  { id: "done", title: "완료", statusKey: "completed" },
];

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  "높음": { bg: "bg-red-50", text: "text-red-600" },
  "보통": { bg: "bg-slate-100", text: "text-slate-600" },
  "낮음": { bg: "bg-blue-50", text: "text-blue-500" },
  "긴급": { bg: "bg-red-500", text: "text-white" },
};

const LABEL_COLORS = [
  { value: "red", bg: "bg-red-400" },
  { value: "orange", bg: "bg-orange-400" },
  { value: "amber", bg: "bg-amber-400" },
  { value: "green", bg: "bg-emerald-400" },
  { value: "blue", bg: "bg-blue-400" },
  { value: "purple", bg: "bg-purple-400" },
  { value: "pink", bg: "bg-pink-400" },
];

const STATUS_MAP: Record<string, string> = {
  pending: "pending",
  planned: "pending",
  in_progress: "in_progress",
  active: "in_progress",
  review: "in_progress",
  completed: "completed",
};

function parseResultMeta(result: string | undefined | null): { priority: string; progress: number } {
  if (!result) return { priority: "보통", progress: 0 };
  try {
    const parsed = JSON.parse(result);
    return { priority: parsed.priority || "보통", progress: parsed.progress || 0 };
  } catch {
    return { priority: "보통", progress: 0 };
  }
}

export default function KanbanTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [columns, setColumns] = useState<Column[]>([]);
  const [customCols, setCustomCols] = useState<{ id: string; title: string; statusKey: string }[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [showDetail, setShowDetail] = useState<KanbanCard | null>(null);
  const [detailForm, setDetailForm] = useState({ title: "", description: "", assignee: "", priority: "보통", deadline: "", labels: [] as string[] });
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [dragCard, setDragCard] = useState<{ cardId: string; fromCol: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [mobileMovingCard, setMobileMovingCard] = useState<{ cardId: string; fromCol: string } | null>(null);

  const allColDefs = [...DEFAULT_COLUMNS, ...customCols];

  const loadTeam = useCallback(async () => {
    const s = sb();
    if (!s) return;
    const { data } = await s.from("hq_team").select("name").neq("approved", false);
    if (data) setTeamMembers(data.map((d: any) => d.name).filter(Boolean));
  }, []);

  const load = useCallback(async () => {
    const s = sb();
    if (!s) return;
    const { data } = await s.from("hq_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!data) return;

    const cards: KanbanCard[] = data.map((t: any) => {
      const meta = parseResultMeta(t.result);
      let labels: string[] = [];
      try { if (t.result) { const p = JSON.parse(t.result); labels = p.labels || []; } } catch {}
      return {
        id: t.id,
        title: t.title || "",
        assignee: t.assignee || "",
        priority: meta.priority,
        deadline: t.deadline || "",
        description: t.description || "",
        labels,
        status: t.status || "pending",
        goal_id: t.goal_id || null,
      };
    });

    const cols: Column[] = allColDefs.map(def => ({
      ...def,
      cards: cards.filter(c => {
        const mapped = STATUS_MAP[c.status] || c.status;
        if (def.statusKey === "pending") return mapped === "pending";
        if (def.statusKey === "in_progress") return mapped === "in_progress";
        if (def.statusKey === "completed") return mapped === "completed";
        return c.status === def.statusKey;
      }),
    }));

    setColumns(cols);
  }, [userId, customCols]);

  useEffect(() => { load(); loadTeam(); }, [load, loadTeam]);

  // ── Drag and Drop ──
  const handleDragStart = (e: React.DragEvent, cardId: string, fromCol: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);
    setDragCard({ cardId, fromCol });
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, toColId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragCard) return;

    const targetCol = allColDefs.find(c => c.id === toColId);
    if (!targetCol || dragCard.fromCol === toColId) { setDragCard(null); return; }

    const s = sb();
    if (!s) { setDragCard(null); return; }

    const newStatus = targetCol.statusKey;
    const { error } = await s.from("hq_tasks").update({ status: newStatus }).eq("id", dragCard.cardId);
    if (error) {
      flash("상태 변경 실패: " + error.message);
    } else {
      flash("상태가 변경되었습니다");
      await load();
    }
    setDragCard(null);
  };

  // ── Mobile Move Card ──
  const handleMobileMove = async (toColId: string) => {
    if (!mobileMovingCard) return;
    const targetCol = allColDefs.find(c => c.id === toColId);
    if (!targetCol || mobileMovingCard.fromCol === toColId) { setMobileMovingCard(null); return; }
    const s = sb();
    if (!s) { setMobileMovingCard(null); return; }
    const newStatus = targetCol.statusKey;
    const { error } = await s.from("hq_tasks").update({ status: newStatus }).eq("id", mobileMovingCard.cardId);
    if (error) {
      flash("상태 변경 실패: " + error.message);
    } else {
      flash("상태가 변경되었습니다");
      await load();
    }
    setMobileMovingCard(null);
  };

  // ── Add Card ──
  const addCard = async (colId: string) => {
    if (!newCardTitle.trim()) return;
    const col = allColDefs.find(c => c.id === colId);
    if (!col) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_tasks").insert({
      user_id: userId,
      title: newCardTitle.trim(),
      assignee: userName,
      status: col.statusKey,
      result: JSON.stringify({ priority: "보통", progress: 0, labels: [] }),
    });
    if (error) flash("추가 실패: " + error.message);
    else { flash("카드가 추가되었습니다"); setNewCardTitle(""); setAddingToCol(null); await load(); }
  };

  // ── Card Detail Modal ──
  const openDetail = (card: KanbanCard) => {
    setShowDetail(card);
    setDetailForm({
      title: card.title,
      description: card.description,
      assignee: card.assignee,
      priority: card.priority,
      deadline: card.deadline,
      labels: [...card.labels],
    });
  };

  const saveDetail = async () => {
    if (!showDetail) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_tasks").update({
      title: detailForm.title,
      assignee: detailForm.assignee,
      deadline: detailForm.deadline || null,
      result: JSON.stringify({ priority: detailForm.priority, progress: 0, labels: detailForm.labels }),
    }).eq("id", showDetail.id);
    if (error) flash("수정 실패: " + error.message);
    else { flash("카드가 수정되었습니다"); setShowDetail(null); await load(); }
  };

  const toggleLabel = (color: string) => {
    setDetailForm(prev => ({
      ...prev,
      labels: prev.labels.includes(color) ? prev.labels.filter(l => l !== color) : [...prev.labels, color],
    }));
  };

  // ── Custom Column ──
  const addColumn = () => {
    if (!newColTitle.trim()) return;
    const id = `custom_${Date.now()}`;
    setCustomCols(prev => [...prev, { id, title: newColTitle.trim(), statusKey: id }]);
    setNewColTitle("");
    setShowAddCol(false);
  };

  const deleteColumn = (colId: string) => {
    if (!confirm("이 컬럼을 삭제하시겠습니까? 포함된 카드는 '할 일'로 이동합니다.")) return;
    const col = columns.find(c => c.id === colId);
    if (col && col.cards.length > 0) {
      const s = sb();
      if (s) {
        Promise.all(col.cards.map(c => s.from("hq_tasks").update({ status: "pending" }).eq("id", c.id))).then(() => load());
      }
    }
    setCustomCols(prev => prev.filter(c => c.id !== colId));
  };

  const renameColumn = (colId: string) => {
    if (!renameTitle.trim()) return;
    setCustomCols(prev => prev.map(c => c.id === colId ? { ...c, title: renameTitle.trim() } : c));
    setRenamingCol(null);
    setRenameTitle("");
  };

  const priorityBadge = (p: string) => {
    const s = PRIORITY_STYLES[p] || PRIORITY_STYLES["보통"];
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${s.bg} ${s.text}`}>{p}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">칸반 보드</h3>
        <button onClick={() => setShowAddCol(true)} className={B2 + " !text-sm !px-3 !py-1.5"}>
          + 컬럼 추가
        </button>
      </div>

      {showAddCol && (
        <div className="flex items-center gap-2">
          <input className={I + " !py-2 !text-sm max-w-[200px]"} placeholder="컬럼 이름" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addColumn()} />
          <button onClick={addColumn} className={B + " !text-sm !px-3 !py-2"}>추가</button>
          <button onClick={() => { setShowAddCol(false); setNewColTitle(""); }} className={B2 + " !text-sm !px-3 !py-2"}>취소</button>
        </div>
      )}

      {/* Mobile scroll hint */}
      <p className="md:hidden text-xs text-slate-400 font-medium flex items-center gap-1">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 8l-6-6-6 6" /><path d="M6 16l6 6 6-6" /></svg>
        좌우로 스크롤하세요
      </p>

      {/* Mobile move column selector dropdown */}
      {mobileMovingCard && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-50 flex items-end justify-center" onClick={() => setMobileMovingCard(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md shadow-2xl p-5 space-y-2" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-slate-800 mb-3">이동할 컬럼 선택</h4>
            {allColDefs.map(col => (
              <button
                key={col.id}
                onClick={() => handleMobileMove(col.id)}
                disabled={col.id === mobileMovingCard.fromCol}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  col.id === mobileMovingCard.fromCol
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-slate-50 text-slate-700 hover:bg-[#3182F6]/10 hover:text-[#3182F6] active:scale-[0.98]"
                }`}
              >
                {col.title} {col.id === mobileMovingCard.fromCol && "(현재)"}
              </button>
            ))}
            <button onClick={() => setMobileMovingCard(null)} className="w-full text-center text-sm text-slate-400 font-semibold py-2 mt-1">취소</button>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const isCustom = customCols.some(c => c.id === col.id);
          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-[280px] rounded-2xl transition-all ${
                dragOverCol === col.id ? "bg-[#3182F6]/10 ring-2 ring-[#3182F6]/30" : "bg-slate-50/80"
              }`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                {renamingCol === col.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input className="text-sm font-bold border-b border-[#3182F6] outline-none bg-transparent flex-1" value={renameTitle} onChange={e => setRenameTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && renameColumn(col.id)} autoFocus />
                    <button onClick={() => renameColumn(col.id)} className="text-[10px] text-[#3182F6] font-semibold">확인</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-700">{col.title}</h4>
                    <span className="text-xs font-bold bg-slate-200 text-slate-500 rounded-full w-5 h-5 flex items-center justify-center">{col.cards.length}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {isCustom && renamingCol !== col.id && (
                    <>
                      <button onClick={() => { setRenamingCol(col.id); setRenameTitle(col.title); }} className="text-[10px] text-slate-400 hover:text-[#3182F6] px-1">이름변경</button>
                      <button onClick={() => deleteColumn(col.id)} className="text-[10px] text-slate-400 hover:text-red-500 px-1">삭제</button>
                    </>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="px-3 pb-3 space-y-2 min-h-[80px]">
                {col.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={e => handleDragStart(e, card.id, col.id)}
                    onClick={() => openDetail(card)}
                    className="bg-white rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md transition-all cursor-pointer border border-slate-100 hover:border-[#3182F6]/30 active:scale-[0.98]"
                  >
                    {/* Labels */}
                    {card.labels.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {card.labels.map(l => {
                          const lc = LABEL_COLORS.find(c => c.value === l);
                          return <span key={l} className={`w-8 h-1.5 rounded-full ${lc?.bg || "bg-slate-300"}`} />;
                        })}
                      </div>
                    )}
                    {/* Title */}
                    <p className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{card.title}</p>
                    {/* Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {priorityBadge(card.priority)}
                        {card.deadline && (
                          <span className="text-[10px] text-slate-400 font-medium">{card.deadline.slice(5)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Mobile move button */}
                        <button
                          onClick={e => { e.stopPropagation(); setMobileMovingCard({ cardId: card.id, fromCol: col.id }); }}
                          className="md:hidden text-[10px] font-bold text-slate-400 hover:text-[#3182F6] bg-slate-50 hover:bg-[#3182F6]/10 px-2 py-1 rounded-lg transition-all"
                        >
                          이동
                        </button>
                        {card.assignee && (
                          <span className="w-6 h-6 rounded-full bg-[#3182F6]/10 text-[#3182F6] text-[10px] font-bold flex items-center justify-center" title={displayName(card.assignee)}>
                            {card.assignee.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add card */}
                {addingToCol === col.id ? (
                  <div className="space-y-2">
                    <input className={I + " !py-2 !text-sm"} placeholder="카드 제목" value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addCard(col.id)} autoFocus />
                    <div className="flex gap-1">
                      <button onClick={() => addCard(col.id)} className={B + " !text-xs !px-3 !py-1.5"}>추가</button>
                      <button onClick={() => { setAddingToCol(null); setNewCardTitle(""); }} className={B2 + " !text-xs !px-3 !py-1.5"}>취소</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingToCol(col.id); setNewCardTitle(""); }}
                    className="w-full text-left text-sm text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl px-3 py-2 transition-all font-medium"
                  >
                    + 카드 추가
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 md:p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">카드 상세</h3>
                <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">제목</label>
                <input className={I} value={detailForm.title} onChange={e => setDetailForm({ ...detailForm, title: e.target.value })} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">설명</label>
                <textarea className={I + " !min-h-[80px] resize-none"} value={detailForm.description} onChange={e => setDetailForm({ ...detailForm, description: e.target.value })} placeholder="설명을 입력하세요" />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">담당자</label>
                <select className={I} value={detailForm.assignee} onChange={e => setDetailForm({ ...detailForm, assignee: e.target.value })}>
                  <option value="">선택 안함</option>
                  {teamMembers.map(m => (
                    <option key={m} value={m}>{displayName(m)}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">우선순위</label>
                <div className="flex gap-2">
                  {["높음", "보통", "낮음"].map(p => {
                    const s = PRIORITY_STYLES[p];
                    return (
                      <button key={p} onClick={() => setDetailForm({ ...detailForm, priority: p })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          detailForm.priority === p ? `${s.bg} ${s.text} ring-2 ring-offset-1 ring-slate-300` : "bg-slate-100 text-slate-400"
                        }`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">마감일</label>
                <input type="date" className={I} value={detailForm.deadline} onChange={e => setDetailForm({ ...detailForm, deadline: e.target.value })} />
              </div>

              {/* Labels */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">라벨</label>
                <div className="flex gap-2 flex-wrap">
                  {LABEL_COLORS.map(lc => (
                    <button key={lc.value} onClick={() => toggleLabel(lc.value)}
                      className={`w-8 h-6 rounded-lg ${lc.bg} transition-all ${
                        detailForm.labels.includes(lc.value) ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "opacity-50 hover:opacity-80"
                      }`} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={saveDetail} className={B}>저장</button>
                <button onClick={() => setShowDetail(null)} className={B2}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
