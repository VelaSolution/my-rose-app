"use client";
import { useState, useEffect } from "react";
import { HQRole, BoardPost, BoardComment } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const CATEGORIES = ["전체", "자유", "공지", "질문", "정보", "부서"] as const;
type Category = (typeof CATEGORIES)[number];

const categoryColor: Record<string, string> = {
  "자유": "bg-blue-50 text-blue-700",
  "공지": "bg-red-50 text-red-700",
  "질문": "bg-purple-50 text-purple-700",
  "정보": "bg-emerald-50 text-emerald-700",
  "부서": "bg-amber-50 text-amber-700",
};

export default function BoardTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [comments, setComments] = useState<BoardComment[]>([]);

  const [activeCat, setActiveCat] = useState<Category>("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [fCat, setFCat] = useState<string>("자유");
  const [fTitle, setFTitle] = useState("");
  const [fContent, setFContent] = useState("");

  // Comment
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);

  const load = async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    try {
      const { data, error } = await s.from("hq_board").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: BoardPost[] = data.map((d: any) => ({
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
        }));
        setPosts(mapped);
      }
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
      const { error } = await s.from("hq_board").insert({
        category: fCat,
        title: fTitle.trim(),
        content: fContent.trim(),
        author: userName,
        views: 0,
        likes: 0,
        pinned: false,
      });
      if (error) throw error;
      await load();
      setFTitle(""); setFContent(""); setFCat("자유"); setShowForm(false);
      flash("게시글 등록 완료");
    } catch (e) {
      console.error("addPost error:", e);
      flash("게시글 등록 실패");
    }
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

  const canPin = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const sorted = [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
  const filtered = activeCat === "전체" ? sorted : sorted.filter((p) => p.category === activeCat);

  return (
    <div className="space-y-6">
      {/* Category tabs + New button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-1 mr-3">
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
            <div>
              <label className={L}>내용</label>
              <textarea className={`${I} min-h-[120px]`} rows={5} value={fContent} onChange={(e) => setFContent(e.target.value)} placeholder="내용을 입력하세요" />
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
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">{post.content || "(내용 없음)"}</p>

                    {/* Actions */}
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
                    </div>

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
