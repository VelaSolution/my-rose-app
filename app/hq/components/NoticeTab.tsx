"use client";
import { useState, useEffect, useMemo } from "react";
import { HQRole, Notice } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const CATEGORIES = [
  { key: "일반", color: "bg-slate-50 text-slate-600" },
  { key: "긴급", color: "bg-red-50 text-red-600" },
  { key: "인사", color: "bg-purple-50 text-purple-600" },
  { key: "경영", color: "bg-blue-50 text-blue-600" },
] as const;
type NoticeCategory = typeof CATEGORIES[number]["key"];

interface EnrichedNotice extends Notice {
  category?: NoticeCategory;
  important?: boolean;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#3182F6] underline hover:text-[#2672DE] break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function NoticeTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [notices, setNotices] = useState<EnrichedNotice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [important, setImportant] = useState(false);
  const [category, setCategory] = useState<NoticeCategory>("일반");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamCount, setTeamCount] = useState(0);

  const load = async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    const [{ data }, { count }] = await Promise.all([
      s.from("hq_notices")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      s.from("hq_team").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    if (count !== null) setTeamCount(count);
    if (data) {
      setNotices(
        data.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          date: d.created_at?.slice(0, 10) ?? today(),
          pinned: d.pinned ?? false,
          author: d.author ?? "",
          readBy: d.read_by ?? [],
          category: d.category ?? "일반",
          important: d.important ?? false,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return notices;
    const q = search.toLowerCase();
    return notices.filter(
      n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.author.toLowerCase().includes(q)
    );
  }, [notices, search]);

  const handleAdd = async () => {
    if (!title.trim()) { flash("제목을 입력하세요"); return; }
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_notices").insert({
      title: title.trim(),
      content: content.trim(),
      pinned,
      important,
      category,
      author: userName,
      read_by: [userName],
    });
    if (error) { flash("저장 실패"); return; }
    setTitle("");
    setContent("");
    setPinned(false);
    setImportant(false);
    setCategory("일반");
    flash("공지 등록 완료");
    load();
  };

  const markRead = async (n: EnrichedNotice) => {
    if (n.readBy?.includes(userName)) return;
    const s = sb();
    if (!s) return;
    const newReadBy = [...(n.readBy ?? []), userName];
    await s.from("hq_notices").update({ read_by: newReadBy }).eq("id", n.id);
    load();
  };

  const togglePin = async (n: EnrichedNotice) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_notices").update({ pinned: !n.pinned }).eq("id", n.id);
    flash(n.pinned ? "고정 해제" : "고정됨");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_notices").delete().eq("id", id);
    flash("삭제 완료");
    load();
  };

  const canManage = myRole === "대표" || myRole === "이사" || myRole === "팀장";
  const catMeta = (key: string) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0];
  const displayTeamCount = teamCount > 0 ? teamCount : "?";

  return (
    <div className="space-y-6">
      {/* 작성 폼 */}
      {canManage && (
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">공지 작성</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={L}>제목</label>
                <input className={I} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" />
              </div>
              <div>
                <label className={L}>카테고리</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`${BADGE} transition-all ${category === c.key ? c.color + " ring-2 ring-offset-1 ring-blue-300" : "bg-slate-50 text-slate-400"}`}
                    >
                      {c.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className={L}>내용</label>
              <textarea className={`${I} min-h-[100px]`} rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="공지 내용을 입력하세요" />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded border-slate-300 text-[#3182F6] focus:ring-[#3182F6]" />
                  상단 고정
                </label>
                <label className="flex items-center gap-2 text-sm text-red-500 cursor-pointer">
                  <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="rounded border-red-300 text-red-500 focus:ring-red-300" />
                  중요 공지
                </label>
              </div>
              <button className={B} onClick={handleAdd}>등록</button>
            </div>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className={`${I} pl-10`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="공지 검색..."
        />
      </div>

      {/* 공지 목록 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{search ? "검색 결과가 없습니다" : "등록된 공지가 없습니다"}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const isRead = n.readBy?.includes(userName);
            const expanded = expandedId === n.id;
            const cm = catMeta(n.category ?? "일반");
            const readCount = n.readBy?.length ?? 0;
            return (
              <div
                key={n.id}
                className={`${C} ${n.important ? "border-red-300 border-l-4 bg-red-50/30" : ""}`}
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => {
                    setExpandedId(expanded ? null : n.id);
                    if (!isRead) markRead(n);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {n.pinned && (
                        <span className={`${BADGE} bg-amber-50 text-amber-700`}>
                          <span className="mr-1">&#128204;</span>고정
                        </span>
                      )}
                      {n.important && (
                        <span className={`${BADGE} bg-red-50 text-red-600`}>
                          중요
                        </span>
                      )}
                      <span className={`${BADGE} ${cm.color}`}>
                        {n.category ?? "일반"}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#3182F6] flex-shrink-0" />
                      )}
                      <h4 className={`text-slate-800 truncate ${isRead ? "font-medium" : "font-bold"}`}>{n.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{displayName(n.author)}</span>
                      <span>{n.date}</span>
                      <span className={`inline-flex items-center gap-1 ${readCount === teamCount && teamCount > 0 ? "text-emerald-500" : ""}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        읽음 {readCount}/{displayTeamCount}
                      </span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {n.content ? linkify(n.content) : "(내용 없음)"}
                    </div>

                    {/* Read receipt detail */}
                    {(n.readBy?.length ?? 0) > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          읽은 사람 ({readCount}/{displayTeamCount})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {n.readBy!.map((name) => (
                            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {canManage && (
                      <div className="flex gap-2 mt-4">
                        <button className={B2} onClick={(e) => { e.stopPropagation(); togglePin(n); }}>
                          {n.pinned ? "고정 해제" : "고정"}
                        </button>
                        <button className="rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition-all" onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
