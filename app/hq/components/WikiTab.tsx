"use client";
import React, { useState, useEffect, useMemo } from "react";
import { HQRole, WikiArticle } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const CATEGORIES = ["가이드", "정책", "기술", "일반"];
const CAT_COLOR: Record<string, string> = {
  "가이드": "bg-blue-50 text-blue-700",
  "정책": "bg-purple-50 text-purple-700",
  "기술": "bg-emerald-50 text-emerald-700",
  "일반": "bg-slate-100 text-slate-600",
};

type View = "list" | "create" | "detail" | "edit";

// Highlight search term helper
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

// Extract headings from content
function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const lines = content.split("\n");
  const headings: { level: number; text: string; id: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        id: match[2].trim().toLowerCase().replace(/\s+/g, "-"),
      });
    }
  }
  return headings;
}

export default function WikiTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fCategory, setFCategory] = useState("일반");
  const [fTags, setFTags] = useState("");
  const [fContent, setFContent] = useState("");

  const loadArticles = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_wiki").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setArticles(data.map((d: any) => ({
          id: d.id,
          title: d.title ?? "",
          content: d.content ?? "",
          category: d.category ?? "일반",
          author: d.author ?? "",
          lastEditor: d.last_editor ?? "",
          date: d.created_at?.slice(0, 10) ?? today(),
          updatedAt: d.updated_at?.slice(0, 10) ?? today(),
          tags: d.tags ?? [],
          views: d.views ?? 0,
        })));
      }
    } catch (e) {
      console.error("WikiTab loadArticles error:", e);
    }
  };

  useEffect(() => { loadArticles(); }, []);

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = articles.filter(a => a.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = articles
    .filter(a => !filterCat || a.category === filterCat)
    .filter(a => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
    });

  // Popular articles (top 5 by views)
  const popularArticles = useMemo(() =>
    [...articles].sort((a, b) => b.views - a.views).slice(0, 5),
    [articles]
  );

  const selected = articles.find(a => a.id === selectedId);

  // Related articles (same category, excluding current)
  const relatedArticles = useMemo(() => {
    if (!selected) return [];
    return articles
      .filter(a => a.id !== selected.id && a.category === selected.category)
      .slice(0, 5);
  }, [selected, articles]);

  // Table of contents
  const toc = useMemo(() => {
    if (!selected) return [];
    return extractHeadings(selected.content);
  }, [selected]);

  const resetForm = () => { setFTitle(""); setFCategory("일반"); setFTags(""); setFContent(""); };

  const openCreate = () => {
    resetForm();
    setView("create");
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    const s = sb();
    if (s) {
      const article = articles.find(a => a.id === id);
      if (article) {
        try {
          await s.from("hq_wiki").update({ views: (article.views ?? 0) + 1 }).eq("id", id);
        } catch { /* ignore */ }
      }
    }
    setArticles(prev => prev.map(a => a.id === id ? { ...a, views: a.views + 1 } : a));
    setView("detail");
  };

  const openEdit = () => {
    if (!selected) return;
    setFTitle(selected.title);
    setFCategory(selected.category);
    setFTags(selected.tags.join(", "));
    setFContent(selected.content);
    setView("edit");
  };

  const saveArticle = async () => {
    if (!fTitle.trim()) { flash("제목을 입력하세요"); return; }
    if (!fContent.trim()) { flash("내용을 입력하세요"); return; }
    const tags = fTags.split(",").map(t => t.trim()).filter(Boolean);
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_wiki").insert({
        title: fTitle.trim(),
        content: fContent.trim(),
        category: fCategory,
        author: userName,
        last_editor: userName,
        tags,
        views: 0,
      });
      if (error) throw error;
      await loadArticles();
      flash("문서가 작성되었습니다");
      resetForm();
      setView("list");
    } catch (e) {
      console.error("saveArticle error:", e);
      flash("문서 작성 실패");
    }
  };

  const updateArticle = async () => {
    if (!selected) return;
    if (!fTitle.trim()) { flash("제목을 입력하세요"); return; }
    if (!fContent.trim()) { flash("내용을 입력하세요"); return; }
    const tags = fTags.split(",").map(t => t.trim()).filter(Boolean);
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_wiki").update({
        title: fTitle.trim(),
        content: fContent.trim(),
        category: fCategory,
        tags,
        last_editor: userName,
        updated_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (error) throw error;
      await loadArticles();
      flash("문서가 수정되었습니다");
      setView("detail");
    } catch (e) {
      console.error("updateArticle error:", e);
      flash("문서 수정 실패");
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("문서를 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_wiki").delete().eq("id", id);
      if (error) throw error;
      await loadArticles();
      flash("문서가 삭제되었습니다");
      setView("list");
    } catch (e) {
      console.error("deleteArticle error:", e);
      flash("문서 삭제 실패");
    }
  };

  // Render content with heading anchors
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, "-");
        const Tag = `h${Math.min(level + 1, 6)}` as keyof React.JSX.IntrinsicElements;
        const sizes: Record<number, string> = { 1: "text-xl font-bold", 2: "text-lg font-bold", 3: "text-base font-semibold", 4: "text-sm font-semibold" };
        return <Tag key={i} id={id} className={`${sizes[level] || "text-sm font-semibold"} text-slate-800 mt-4 mb-2`}>{text}</Tag>;
      }
      return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line || " "}</p>;
    });
  };

  // ---- DETAIL VIEW ----
  if (view === "detail" && selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className={B2}>&larr; 목록</button>
        </div>
        <div className="flex gap-6">
          {/* TOC sidebar */}
          {toc.length > 0 && (
            <div className="w-48 shrink-0 hidden lg:block">
              <div className={`${C} sticky top-4`}>
                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">목차</h4>
                <div className="space-y-1">
                  {toc.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      className="block text-xs text-slate-500 hover:text-[#3182F6] transition-colors truncate"
                      style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                      onClick={e => {
                        e.preventDefault();
                        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {h.text}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className={C}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${BADGE} text-[11px] ${CAT_COLOR[selected.category] || CAT_COLOR["일반"]}`}>{selected.category}</span>
                    <span className="text-xs text-slate-400">조회 {selected.views}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{selected.title}</h2>
                  {/* Prominent last editor info */}
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-[#3182F6]/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#3182F6]">{displayName(selected.lastEditor || selected.author).charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        마지막 수정: {displayName(selected.lastEditor || selected.author)}
                      </p>
                      <p className="text-[10px] text-slate-400">{selected.updatedAt} (작성자: {displayName(selected.author)})</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={openEdit} className={B2}>편집</button>
                  <button onClick={() => deleteArticle(selected.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors">삭제</button>
                </div>
              </div>

              {selected.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {selected.tags.map((t, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">#{t}</span>
                  ))}
                </div>
              )}

              {/* Mobile TOC */}
              {toc.length > 0 && (
                <div className="lg:hidden mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">목차</h4>
                  <div className="flex flex-wrap gap-1">
                    {toc.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" })}
                        className="text-[11px] px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#3182F6] hover:border-[#3182F6]/30 transition-colors"
                      >
                        {h.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <div className="prose prose-sm max-w-none">
                  {renderContent(selected.content)}
                </div>
              </div>
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className={C}>
                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">관련 문서 ({selected.category})</h4>
                <div className="space-y-2">
                  {relatedArticles.map(a => (
                    <div
                      key={a.id}
                      onClick={() => openDetail(a.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{a.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{a.content.slice(0, 60)}</p>
                      </div>
                      <span className="text-[10px] text-slate-300 ml-2 shrink-0">조회 {a.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- CREATE / EDIT VIEW ----
  if (view === "create" || view === "edit") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView(view === "edit" ? "detail" : "list"); resetForm(); }} className={B2}>&larr; 뒤로</button>
          <h2 className="text-sm font-bold text-slate-700">{view === "edit" ? "문서 편집" : "문서 작성"}</h2>
        </div>
        <div className={C}>
          <div className="space-y-4">
            <div>
              <label className={L}>제목</label>
              <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="문서 제목" className={I} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={L}>카테고리</label>
                <select value={fCategory} onChange={e => setFCategory(e.target.value)} className={I}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={L}>태그 (쉼표 구분)</label>
                <input value={fTags} onChange={e => setFTags(e.target.value)} placeholder="온보딩, 개발, 가이드" className={I} />
              </div>
            </div>
            <div>
              <label className={L}>내용 (## 으로 제목을 만들면 목차가 자동 생성됩니다)</label>
              <textarea
                value={fContent}
                onChange={e => setFContent(e.target.value)}
                placeholder="문서 내용을 작성하세요"
                rows={16}
                className={`${I} font-mono`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => { setView(view === "edit" ? "detail" : "list"); resetForm(); }} className={B2}>취소</button>
            <button onClick={view === "edit" ? updateArticle : saveArticle} className={B}>
              {view === "edit" ? "수정 완료" : "작성 완료"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="flex gap-6">
      {/* Category sidebar */}
      <div className="w-48 shrink-0 hidden sm:block space-y-4">
        <div className={C}>
          <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">카테고리</h3>
          <div className="space-y-1">
            <button
              onClick={() => setFilterCat(null)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                !filterCat ? "bg-[#3182F6] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              전체 <span className="text-xs opacity-70">({articles.length})</span>
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(filterCat === c ? null : c)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                  filterCat === c ? "bg-[#3182F6] text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c} <span className="text-xs opacity-70">({catCounts[c]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular articles */}
        {popularArticles.length > 0 && (
          <div className={C}>
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">인기 문서</h3>
            <div className="space-y-1.5">
              {popularArticles.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => openDetail(a.id)}
                  className="w-full text-left flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[10px] font-bold text-slate-300 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600 truncate">{a.title}</p>
                    <p className="text-[10px] text-slate-400">조회 {a.views}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search & create */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="문서 검색 (제목, 내용, 태그)"
              className={`${I} pl-9`}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button onClick={openCreate} className={B}>+ 문서 작성</button>
        </div>

        {/* Mobile category filter */}
        <div className="flex gap-1 flex-wrap sm:hidden">
          <button
            onClick={() => setFilterCat(null)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${!filterCat ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            전체
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(filterCat === c ? null : c)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${filterCat === c ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Article list */}
        {filtered.length === 0 ? (
          <div className={C}>
            <p className="text-center text-sm text-slate-400 py-12">
              {search ? "검색 결과가 없습니다" : "등록된 문서가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <div
                key={a.id}
                onClick={() => openDetail(a.id)}
                className={`${C} cursor-pointer hover:border-blue-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${BADGE} text-[11px] ${CAT_COLOR[a.category] || CAT_COLOR["일반"]}`}>{a.category}</span>
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {search ? highlightText(a.title, search) : a.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {search ? highlightText(a.content.slice(0, 120), search) : a.content.slice(0, 120)}
                    </p>
                    {a.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {a.tags.slice(0, 5).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                            #{search ? highlightText(t, search) : t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-slate-400">{displayName(a.lastEditor || a.author)}</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">{a.updatedAt}</p>
                    <p className="text-[11px] text-slate-300">조회 {a.views}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
