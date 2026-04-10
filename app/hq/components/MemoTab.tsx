"use client";
import { useState, useEffect, useMemo } from "react";
import { HQRole, MemoItem } from "@/app/hq/types";
import { sb, I, C, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const MEMO_COLORS = [
  { key: "white", bg: "bg-white", border: "border-slate-200/60", label: "기본" },
  { key: "yellow", bg: "bg-amber-50", border: "border-amber-200", label: "노랑" },
  { key: "green", bg: "bg-emerald-50", border: "border-emerald-200", label: "초록" },
  { key: "blue", bg: "bg-blue-50", border: "border-blue-200", label: "파랑" },
  { key: "pink", bg: "bg-pink-50", border: "border-pink-200", label: "분홍" },
  { key: "purple", bg: "bg-purple-50", border: "border-purple-200", label: "보라" },
] as const;
type MemoColor = typeof MEMO_COLORS[number]["key"];

const MEMO_TAGS = ["업무", "아이디어", "중요", "개인", "회의", "참고"] as const;
type MemoTag = typeof MEMO_TAGS[number];

interface EnrichedMemo extends MemoItem {
  author?: string;
  color?: MemoColor;
  pinned?: boolean;
  tags?: string[];
  created_at?: string;
}

const MAX_CHARS = 2000;

export default function MemoTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [memos, setMemos] = useState<EnrichedMemo[]>([]);
  const [content, setContent] = useState("");
  const [color, setColor] = useState<MemoColor>("white");
  const [selectedTags, setSelectedTags] = useState<MemoTag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    const { data } = await s.from("hq_memos").select("*").order("created_at", { ascending: false });
    if (data) {
      setMemos(
        data.map((d: any) => ({
          id: d.id,
          content: d.content ?? "",
          time: d.created_at
            ? new Date(d.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "",
          author: d.author ?? "",
          color: d.color ?? "white",
          pinned: d.pinned ?? false,
          tags: d.tags ?? [],
          created_at: d.created_at ?? "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleTag = (tag: MemoTag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filtered = useMemo(() => {
    let list = [...memos];
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.content.toLowerCase().includes(q) || (m.author ?? "").toLowerCase().includes(q));
    }
    // sort: pinned first
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    return list;
  }, [memos, search]);

  const handleSave = async () => {
    if (!content.trim()) { flash("내용을 입력하세요"); return; }
    if (content.length > MAX_CHARS) { flash(`최대 ${MAX_CHARS}자까지 입력 가능합니다`); return; }
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_memos").insert({
      content: content.trim(),
      author: userName,
      color,
      pinned: false,
      tags: selectedTags,
    });
    if (error) { flash("저장 실패"); return; }
    setContent("");
    setColor("white");
    setSelectedTags([]);
    flash("메모 저장 완료");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_memos").delete().eq("id", id);
    flash("삭제 완료");
    load();
  };

  const togglePin = async (memo: EnrichedMemo) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_memos").update({ pinned: !memo.pinned }).eq("id", memo.id);
    flash(memo.pinned ? "고정 해제" : "고정됨");
    load();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const getColorClasses = (c: string) => {
    const found = MEMO_COLORS.find(mc => mc.key === c);
    return found ? `${found.bg} ${found.border}` : "bg-white border-slate-200/60";
  };

  const TAG_COLORS: Record<string, string> = {
    "업무": "bg-blue-50 text-blue-600",
    "아이디어": "bg-amber-50 text-amber-600",
    "중요": "bg-red-50 text-red-600",
    "개인": "bg-emerald-50 text-emerald-600",
    "회의": "bg-purple-50 text-purple-600",
    "참고": "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-6">
      {/* 입력 */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">빠른 메모</h3>
        <textarea
          className={`${I} min-h-[120px]`}
          rows={4}
          value={content}
          onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setContent(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="메모를 입력하세요... (Ctrl+Enter로 저장)"
        />
        {/* Character count */}
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${content.length > MAX_CHARS * 0.9 ? "text-red-500 font-semibold" : "text-slate-400"}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs font-semibold text-slate-500">색상</span>
          <div className="flex gap-1.5">
            {MEMO_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${color === c.key ? "ring-2 ring-offset-1 ring-[#3182F6] border-[#3182F6]" : "border-slate-200 hover:border-slate-300"}`}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">태그</span>
          <div className="flex gap-1.5 flex-wrap">
            {MEMO_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`${BADGE} transition-all ${selectedTags.includes(tag)
                  ? (TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600") + " ring-1 ring-offset-1 ring-blue-300"
                  : "bg-slate-50 text-slate-400 hover:text-slate-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button className={B} onClick={handleSave}>저장</button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className={`${I} pl-10`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="메모 검색..."
        />
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{search ? "검색 결과가 없습니다" : "메모가 없습니다"}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow group ${getColorClasses(m.color ?? "white")}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Pinned indicator */}
                  {m.pinned && (
                    <div className="mb-2">
                      <span className={`${BADGE} bg-amber-50 text-amber-700`}>
                        <span className="mr-1">&#128204;</span>고정
                      </span>
                    </div>
                  )}
                  {/* Tags */}
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {m.tags.map((tag: string) => (
                        <span key={tag} className={`${BADGE} ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-500"}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button
                    onClick={() => togglePin(m)}
                    className={`opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-slate-100 ${m.pinned ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                    title={m.pinned ? "고정 해제" : "고정"}
                  >
                    <svg className="w-4 h-4" fill={m.pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-slate-100"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span>{displayName(m.author ?? "")}</span>
                <span>·</span>
                <span>{m.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
