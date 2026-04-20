"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Tab } from "@/app/hq/types";
import { sb } from "@/app/hq/utils";

interface Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

type ResultGroup = {
  type: string;
  tab: Tab;
  icon: string;
  label: string;
  items: { id: string; title: string; sub?: string }[];
};

const RECENT_KEY = "vela_hq_recent_searches";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5); } catch { return []; }
}
function addRecent(q: string) {
  try {
    const arr = getRecent().filter(s => s !== q);
    arr.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 5)));
  } catch {}
}

export default function SearchModal({ userId, isOpen, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const s = sb();
    if (!s) return;
    setLoading(true);
    const term = `%${q.trim()}%`;

    try {
      const [tasks, notices, feedback, files, wiki, board, decisions, memos] = await Promise.all([
        s.from("hq_tasks").select("id, title").ilike("title", term).limit(5),
        s.from("hq_notices").select("id, title, content").or(`title.ilike.${term},content.ilike.${term}`).limit(5),
        s.from("hq_feedback").select("id, title").ilike("title", term).limit(5),
        s.from("hq_files").select("id, name").ilike("name", term).limit(5),
        s.from("hq_wiki").select("id, title, content").or(`title.ilike.${term},content.ilike.${term}`).limit(5),
        s.from("hq_board").select("id, title").ilike("title", term).limit(5),
        s.from("hq_decisions").select("id, title").ilike("title", term).limit(5),
        s.from("hq_memos").select("id, content").ilike("content", term).limit(5),
      ]);

      const groups: ResultGroup[] = [];

      if (tasks.data?.length) groups.push({ type: "task", tab: "task", icon: "✅", label: "태스크", items: tasks.data.map((r: any) => ({ id: r.id, title: r.title })) });
      if (notices.data?.length) groups.push({ type: "notice", tab: "notice", icon: "📢", label: "공지", items: notices.data.map((r: any) => ({ id: r.id, title: r.title, sub: r.content?.slice(0, 60) })) });
      if (feedback.data?.length) groups.push({ type: "feedback", tab: "board", icon: "🐛", label: "피드백", items: feedback.data.map((r: any) => ({ id: r.id, title: r.title })) });
      if (files.data?.length) groups.push({ type: "file", tab: "files", icon: "📁", label: "파일", items: files.data.map((r: any) => ({ id: r.id, title: r.name })) });
      if (wiki.data?.length) groups.push({ type: "wiki", tab: "wiki", icon: "📖", label: "위키", items: wiki.data.map((r: any) => ({ id: r.id, title: r.title, sub: r.content?.slice(0, 60) })) });
      if (board.data?.length) groups.push({ type: "board", tab: "board", icon: "💬", label: "게시판", items: board.data.map((r: any) => ({ id: r.id, title: r.title })) });
      if (decisions.data?.length) groups.push({ type: "decision", tab: "approval", icon: "⚖️", label: "의사결정", items: decisions.data.map((r: any) => ({ id: r.id, title: r.title })) });

      setResults(groups);
      addRecent(q.trim());
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleNavigate = (tab: Tab) => {
    onClose();
    onNavigate(tab);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    search(q);
  };

  if (!isOpen) return null;

  const totalResults = results.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[70vh] flex flex-col overflow-hidden border border-slate-200/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <svg width="20" height="20" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
            placeholder="HQ 전체 검색... (태스크, 공지, 피드백, 파일, 위키 등)"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3182F6] border-t-transparent" />
            </div>
          )}

          {!loading && !query && recent.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">최근 검색</p>
              {recent.map((r, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition flex items-center gap-2"
                  onClick={() => handleRecentClick(r)}
                >
                  <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 1" /></svg>
                  {r}
                </button>
              ))}
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400">검색 결과가 없습니다</p>
              <p className="text-xs text-slate-300 mt-1">다른 키워드로 시도해보세요</p>
            </div>
          )}

          {!loading && results.map(group => (
            <div key={group.type} className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>{group.icon}</span>
                <span>{group.label}</span>
                <span className="text-slate-300">({group.items.length})</span>
              </p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#3182F6]/5 transition flex flex-col gap-0.5"
                  onClick={() => handleNavigate(group.tab)}
                >
                  <span className="text-sm font-medium text-slate-800 truncate">{item.title}</span>
                  {item.sub && <span className="text-xs text-slate-400 truncate">{item.sub}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {totalResults > 0 ? `${totalResults}개 결과` : ""}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">Cmd+K</kbd>
            <span>로 언제든 검색</span>
          </div>
        </div>
      </div>
    </div>
  );
}
