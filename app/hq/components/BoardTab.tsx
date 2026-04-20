"use client";
import { useState, useEffect } from "react";
import { HQRole, BoardPost, BoardComment, BugStatus, BugPriority } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const CATEGORIES = ["전체", "자유", "공지", "질문", "정보", "부서", "버그", "건의"] as const;
type Category = (typeof CATEGORIES)[number];

const categoryColor: Record<string, string> = {
  "자유": "bg-blue-50 text-blue-700",
  "공지": "bg-red-50 text-red-700",
  "질문": "bg-purple-50 text-purple-700",
  "정보": "bg-emerald-50 text-emerald-700",
  "부서": "bg-amber-50 text-amber-700",
  "버그": "bg-rose-50 text-rose-700",
  "건의": "bg-teal-50 text-teal-700",
};

const BUG_STATUSES: BugStatus[] = ["접수", "진행", "완료", "보류"];
const BUG_PRIORITIES: BugPriority[] = ["긴급", "높음", "보통", "낮음"];
const bugStatusColor: Record<BugStatus, string> = {
  "접수": "bg-slate-100 text-slate-600",
  "진행": "bg-blue-50 text-blue-700",
  "완료": "bg-emerald-50 text-emerald-700",
  "보류": "bg-amber-50 text-amber-700",
};
const bugPriorityColor: Record<BugPriority, string> = {
  "긴급": "bg-red-50 text-red-700",
  "높음": "bg-orange-50 text-orange-700",
  "보통": "bg-slate-100 text-slate-600",
  "낮음": "bg-slate-50 text-slate-400",
};

export default function BoardTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [comments, setComments] = useState<BoardComment[]>([]);

  const [activeCat, setActiveCat] = useState<Category>("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  type SortMode = "최신순" | "인기순" | "댓글순";
  const [sortMode, setSortMode] = useState<SortMode>("최신순");

  // Form
  const [fCat, setFCat] = useState<string>("자유");
  const [fTitle, setFTitle] = useState("");
  const [fContent, setFContent] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eCat, setECat] = useState<string>("자유");
  const [eTitle, setETitle] = useState("");
  const [eContent, setEContent] = useState("");

  // Bug form fields
  const [fBugPriority, setFBugPriority] = useState<BugPriority>("보통");

  // Bug filter
  const [bugStatusFilter, setBugStatusFilter] = useState<BugStatus | "전체">("전체");

  // Comment
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);

  const load = async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    try {
      const { data, error } = await s.from("hq_board").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      const mapped: BoardPost[] = (data ?? []).map((d: any) => ({
        id: d.id,
        category: d.category ?? "자유",
        title: d.title ?? "",
        content: d.content ?? "",
        author: d.author ?? "",
        date: d.created_at?.slice(0, 10) ?? today(),
        views: d.views ?? 0,
        likes: d.likes ?? 0,
        comments: 0,
        pinned: d.pinned ?? false,
        bugStatus: d.bug_status as BugStatus | undefined,
        bugPriority: d.bug_priority as BugPriority | undefined,
      }));

      // hq_feedback 데이터도 "버그"/"건의" 카테고리로 표시
      const { data: fbData } = await s.from("hq_feedback").select("*").order("created_at", { ascending: false });
      const statusMap: Record<string, BugStatus> = { "open": "접수", "in_progress": "진행", "resolved": "완료", "closed": "완료", "wontfix": "보류", "접수": "접수", "진행": "진행", "완료": "완료", "보류": "보류" };
      const priorityMap: Record<string, BugPriority> = { "critical": "긴급", "high": "높음", "medium": "보통", "low": "낮음", "긴급": "긴급", "높음": "높음", "보통": "보통", "낮음": "낮음" };
      const feedbackPosts: BoardPost[] = (fbData ?? []).map((f: any) => ({
        id: `fb-${f.id}`,
        category: "버그" as const,
        title: f.title ?? "",
        content: f.description ?? "",
        author: f.author ?? "",
        date: f.date ?? f.created_at?.slice(0, 10) ?? today(),
        views: 0,
        likes: 0,
        comments: 0,
        pinned: false,
        bugStatus: statusMap[f.status] ?? "접수" as BugStatus,
        bugPriority: priorityMap[f.priority] ?? "보통" as BugPriority,
      }));

      setPosts([...mapped, ...feedbackPosts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.date.localeCompare(a.date);
      }));
      // Load comments
      const { data: cData } = await s.from("hq_board_comments").select("*").order("created_at", { ascending: true });
      if (cData) {
        setComments(cData.map((c: any) => ({ id: c.id, postId: c.post_id, author: c.author, content: c.content, date: c.created_at?.slice(0, 16)?.replace("T", " ") ?? "" })));
      }
    } catch (e) {
      console.error("BoardTab load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addPost = async () => {
    if (!fTitle.trim()) { flash("제목을 입력하세요"); return; }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const row: any = {
        category: fCat,
        title: fTitle.trim(),
        content: fContent.trim(),
        author: userName,
        views: 0,
        likes: 0,
        pinned: false,
      };
      if (fCat === "버그") {
        row.bug_status = "접수";
        row.bug_priority = fBugPriority;
      }
      const { error } = await s.from("hq_board").insert(row);
      if (error) throw error;
      await load();
      setFTitle(""); setFContent(""); setFCat("자유"); setFBugPriority("보통"); setShowForm(false);
      flash("게시글 등록 완료");
    } catch (e) {
      console.error("addPost error:", e);
      flash("게시글 등록 실패");
    }
  };

  const changeBugStatus = async (postId: string, newStatus: BugStatus) => {
    const s = sb(); if (!s) return;
    const isFeedback = postId.startsWith("fb-");
    if (isFeedback) {
      const realId = postId.replace("fb-", "");
      await s.from("hq_feedback").update({ status: newStatus }).eq("id", realId);
    } else {
      await s.from("hq_board").update({ bug_status: newStatus }).eq("id", postId);
    }
    flash(`상태: ${newStatus}`);
    load();
  };

  const changeBugPriority = async (postId: string, newPriority: BugPriority) => {
    const s = sb(); if (!s) return;
    const isFeedback = postId.startsWith("fb-");
    if (isFeedback) {
      const realId = postId.replace("fb-", "");
      await s.from("hq_feedback").update({ priority: newPriority }).eq("id", realId);
    } else {
      await s.from("hq_board").update({ bug_priority: newPriority }).eq("id", postId);
    }
    flash(`우선순위: ${newPriority}`);
    load();
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    // Increment views
    const s = sb();
    const post = posts.find((p) => p.id === id);
    if (s && post) {
      try {
        await s.from("hq_board").update({ views: (post.views ?? 0) + 1 }).eq("id", id);
      } catch {}
    }
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, views: p.views + 1 } : p));
  };

  const likePost = async (id: string) => {
    const s = sb();
    const post = posts.find((p) => p.id === id);
    if (s && post) {
      try {
        await s.from("hq_board").update({ likes: (post.likes ?? 0) + 1 }).eq("id", id);
      } catch {}
    }
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const togglePin = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const newPinned = !post.pinned;
    const s = sb();
    if (s) {
      try {
        await s.from("hq_board").update({ pinned: newPinned }).eq("id", id);
      } catch {}
    }
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, pinned: newPinned } : p));
    flash(newPinned ? "고정됨" : "고정 해제");
  };

  const addComment = async (postId: string) => {
    if (!commentText.trim()) return;
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_board_comments").insert({
        post_id: postId,
        author: userName,
        content: commentText.trim(),
      });
      if (error) throw error;
      await load();
      setCommentText("");
    } catch (e) {
      console.error("addComment error:", e);
      flash("댓글 등록 실패");
    }
  };

  const startEdit = (post: BoardPost) => {
    setEditingId(post.id);
    setECat(post.category);
    setETitle(post.title);
    setEContent(post.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setETitle(""); setEContent(""); setECat("자유");
  };

  const saveEdit = async (id: string) => {
    if (!eTitle.trim()) { flash("제목을 입력하세요"); return; }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_board").update({
        category: eCat,
        title: eTitle.trim(),
        content: eContent.trim(),
      }).eq("id", id);
      if (error) throw error;
      await load();
      cancelEdit();
      flash("게시글 수정 완료");
    } catch (e) {
      console.error("saveEdit error:", e);
      flash("게시글 수정 실패");
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      await s.from("hq_board_comments").delete().eq("post_id", id);
      const { error } = await s.from("hq_board").delete().eq("id", id);
      if (error) throw error;
      await load();
      setExpandedId(null);
      flash("게시글 삭제 완료");
    } catch (e) {
      console.error("deletePost error:", e);
      flash("게시글 삭제 실패");
    }
  };

  const canPin = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const sorted = [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sortMode === "인기순") return b.views - a.views;
    if (sortMode === "댓글순") {
      const aC = comments.filter((c) => c.postId === a.id).length;
      const bC = comments.filter((c) => c.postId === b.id).length;
      return bC - aC;
    }
    return b.date.localeCompare(a.date);
  });
  const catFiltered = activeCat === "전체" ? sorted : sorted.filter((p) => p.category === activeCat);
  const bugFiltered = (activeCat === "버그" && bugStatusFilter !== "전체")
    ? catFiltered.filter((p) => p.bugStatus === bugStatusFilter)
    : catFiltered;
  const filtered = searchQuery.trim()
    ? bugFiltered.filter((p) => {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
      })
    : bugFiltered;

  return (
    <div className="space-y-6">
      {/* Category tabs + New button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 flex-1 mr-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeCat === cat ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className={B} onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "글쓰기"}
        </button>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className={`${I} !pl-10`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 내용, 작성자 검색..."
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(["최신순", "인기순", "댓글순"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${sortMode === mode ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Bug status filter */}
      {activeCat === "버그" && (
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-slate-500">상태:</span>
          {(["전체", ...BUG_STATUSES] as const).map(s => (
            <button key={s} onClick={() => setBugStatusFilter(s)}
              className={`${BADGE} transition-all ${bugStatusFilter === s
                ? (s === "전체" ? "bg-slate-900 text-white" : bugStatusColor[s as BugStatus])
                : "bg-slate-50 text-slate-400 hover:text-slate-600"
              }`}>
              {s}{s !== "전체" && ` (${posts.filter(p => p.category === "버그" && p.bugStatus === s).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Write form */}
      {showForm && (
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">새 게시글</h3>
          <div className="space-y-3">
            <div>
              <label className={L}>카테고리</label>
              <select className={I} value={fCat} onChange={(e) => setFCat(e.target.value)}>
                {CATEGORIES.filter((c) => c !== "전체").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>제목</label>
              <input className={I} value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="게시글 제목" />
            </div>
            {fCat === "버그" && (
              <div>
                <label className={L}>우선순위</label>
                <div className="flex gap-2">
                  {BUG_PRIORITIES.map(p => (
                    <button key={p} onClick={() => setFBugPriority(p)}
                      className={`${BADGE} transition-all ${fBugPriority === p ? bugPriorityColor[p] + " ring-2 ring-offset-1 ring-[#3182F6]" : "bg-slate-50 text-slate-400"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={L}>{fCat === "버그" ? "버그 설명" : "내용"}</label>
              <textarea className={`${I} min-h-[120px]`} rows={5} value={fContent} onChange={(e) => setFContent(e.target.value)} placeholder={fCat === "버그" ? "재현 방법, 예상 동작, 실제 동작 등" : "내용을 입력하세요"} />
            </div>
            <div className="flex justify-end">
              <button className={B} onClick={addPost}>등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">게시글이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const expanded = expandedId === post.id;
            const postComments = comments.filter((c) => c.postId === post.id);
            return (
              <div key={post.id} className={C}>
                {/* Post header */}
                <div className="cursor-pointer" onClick={() => toggleExpand(post.id)}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {post.pinned && (
                      <span className={`${BADGE} bg-amber-50 text-amber-700`}>
                        <span className="mr-1">&#128204;</span>고정
                      </span>
                    )}
                    <span className={`${BADGE} ${categoryColor[post.category] ?? "bg-slate-50 text-slate-600"}`}>
                      {post.category}
                    </span>
                    {post.category === "버그" && post.bugStatus && (
                      <span className={`${BADGE} ${bugStatusColor[post.bugStatus]}`}>{post.bugStatus}</span>
                    )}
                    {post.category === "버그" && post.bugPriority && (
                      <span className={`${BADGE} ${bugPriorityColor[post.bugPriority]}`}>{post.bugPriority}</span>
                    )}
                    <h4 className="font-semibold text-slate-800 flex-1 truncate">{post.title}</h4>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{displayName(post.author)}</span>
                    <span>{post.date}</span>
                    <span>조회 {post.views}</span>
                    <span>좋아요 {post.likes}</span>
                    <span>댓글 {postComments.length}</span>
                  </div>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {/* Bug status/priority controls */}
                    {post.category === "버그" && (
                      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-500">상태</span>
                          <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[14px] font-semibold outline-none"
                            value={post.bugStatus ?? "접수"}
                            onChange={e => changeBugStatus(post.id, e.target.value as BugStatus)}>
                            {BUG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-500">우선순위</span>
                          <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[14px] font-semibold outline-none"
                            value={post.bugPriority ?? "보통"}
                            onChange={e => changeBugPriority(post.id, e.target.value as BugPriority)}>
                            {BUG_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {/* Edit form */}
                    {editingId === post.id ? (
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className={L}>카테고리</label>
                          <select className={I} value={eCat} onChange={(e) => setECat(e.target.value)}>
                            {CATEGORIES.filter((c) => c !== "전체").map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={L}>제목</label>
                          <input className={I} value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="게시글 제목" />
                        </div>
                        <div>
                          <label className={L}>내용</label>
                          <textarea className={`${I} min-h-[120px]`} rows={5} value={eContent} onChange={(e) => setEContent(e.target.value)} placeholder="내용을 입력하세요" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button className={B2} onClick={cancelEdit}>취소</button>
                          <button className={B} onClick={() => saveEdit(post.id)}>저장</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">{post.content || "(내용 없음)"}</p>
                    )}

                    {/* Actions */}
                    {editingId !== post.id && (
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); likePost(post.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-blue-50 hover:text-[#3182F6] transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        좋아요 {post.likes}
                      </button>
                      {canPin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(post.id); }}
                          className={B2}
                        >
                          {post.pinned ? "고정 해제" : "고정"}
                        </button>
                      )}
                      {post.author === userName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(post); }}
                          className={B2}
                        >
                          수정
                        </button>
                      )}
                      {post.author === userName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    )}

                    {/* Comments */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-slate-600">댓글 {postComments.length}개</h5>
                      {postComments.map((c) => (
                        <div key={c.id} className="flex gap-2.5 py-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {displayName(c.author).charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-slate-700">{displayName(c.author)}</span>
                              <span className="text-[10px] text-slate-400">{c.date}</span>
                            </div>
                            <p className="text-sm text-slate-600">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {/* Comment input */}
                      <div className="flex gap-2 mt-2">
                        <input
                          className={`${I} flex-1`}
                          value={expandedId === post.id ? commentText : ""}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComment(post.id); } }}
                          placeholder="댓글을 입력하세요..."
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          className={B}
                          onClick={(e) => { e.stopPropagation(); addComment(post.id); }}
                        >
                          등록
                        </button>
                      </div>
                    </div>
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
