"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt, pct, INDUSTRY_BENCHMARK } from "@/lib/vela";

// ─── 타입 ──────────────────────────────────────────────────────
type Tab = "feed" | "board" | "anonymous" | "benchmark";
type IndustryFilter = "all" | "cafe" | "restaurant" | "bar" | "finedining";
type BoardCategory = "all" | "free" | "question" | "tip";

const INDUSTRY_LABELS: Record<string, string> = {
  cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};
const INDUSTRY_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", bar: "🍺", finedining: "✨", gogi: "🥩",
};
const CATEGORY_LABELS: Record<string, string> = {
  free: "자유", question: "질문", tip: "꿀팁",
};
const CATEGORY_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  question: "bg-blue-50 text-blue-600",
  tip: "bg-amber-50 text-amber-600",
};

// ─── 서브 컴포넌트 ─────────────────────────────────────────────

function IndustryTabs({ value, onChange }: { value: IndustryFilter; onChange: (v: IndustryFilter) => void }) {
  const tabs: { key: IndustryFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "cafe", label: "☕ 카페" },
    { key: "restaurant", label: "🍽️ 음식점" },
    { key: "bar", label: "🍺 술집/바" },
    { key: "finedining", label: "✨ 파인다이닝" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${value === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-slate-600 font-semibold">{text}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── 피드 탭 ───────────────────────────────────────────────────
type SharePost = {
  id: string; user_id?: string; nickname: string; industry: string; title: string;
  total_sales: number; profit: number; net_profit: number; net_margin: number;
  cogs_ratio: number; labor_ratio: number; bep: number; recovery_months: number;
  memo: string; likes: number; views: number; created_at: string;
};

function FeedTab({ userId, isAdmin }: { userId: string | null; isAdmin: boolean }) {
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [filter, setFilter] = useState<IndustryFilter>("all");
  const [sort, setSort] = useState<"created_at" | "likes" | "views">("created_at");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    let q = sb.from("simulation_shares").select("*").order(sort, { ascending: false }).limit(30);
    if (filter !== "all") q = q.eq("industry", filter);
    const { data } = await q;
    setPosts(data ?? []);
    setLoading(false);
  }, [filter, sort]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleLike = async (id: string) => {
    const sb = createSupabaseBrowserClient();
    await sb.rpc("increment_likes", { table_name: "simulation_shares", row_id: id });
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    const sb = createSupabaseBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("simulation_shares").delete().eq("id", id);
    if (error) { alert("삭제 실패: " + error.message); return; }
    fetchPosts();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IndustryTabs value={filter} onChange={setFilter} />
        <div className="flex items-center gap-2">
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
            <option value="created_at">최신순</option>
            <option value="likes">좋아요순</option>
            <option value="views">조회순</option>
          </select>
          <button onClick={() => userId ? setShowForm(true) : router.push("/login?next=/community")}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
            내 수익 공유
          </button>
        </div>
      </div>

      {showForm && userId && <ShareForm userId={userId} onDone={() => { setShowForm(false); fetchPosts(); }} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : posts.length === 0 ? (
        <EmptyState icon="📊" text="아직 공유된 분석이 없어요" sub="내 수익 공유 버튼으로 첫 번째 공유를 남겨보세요" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map(p => <FeedCard key={p.id} post={p} userId={userId} isAdmin={isAdmin} onLike={() => handleLike(p.id)} onDelete={() => handleDelete(p.id)} />)}
        </div>
      )}
    </div>
  );
}

function FeedCard({ post: p, userId, isAdmin, onLike, onDelete }: { post: SharePost; userId: string | null; isAdmin: boolean; onLike: () => void; onDelete: () => void }) {
  const isProfit = p.profit >= 0;
  const isOwn = userId && p.user_id === userId;
  const canDelete = isOwn || isAdmin;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 leading-tight">{p.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{p.nickname} · {new Date(p.created_at).toLocaleDateString("ko-KR")}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {INDUSTRY_ICONS[p.industry] ?? "🏪"} {INDUSTRY_LABELS[p.industry] ?? p.industry}
          </span>
          <div className={`rounded-2xl px-3 py-1.5 text-center ${isProfit ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-[10px] font-semibold text-slate-400">순이익</p>
            <p className={`text-sm font-bold ${isProfit ? "text-emerald-600" : "text-red-500"}`}>{fmt(p.net_profit)}원</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "월매출", value: `${fmt(p.total_sales)}원` },
          { label: "순이익률", value: pct(p.net_margin) },
          { label: "원가율", value: pct(p.cogs_ratio) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
            <p className="text-[10px] text-slate-400">{label}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {p.memo && <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{p.memo}</p>}

      <div className="flex items-center justify-between pt-1">
        <button onClick={onLike} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700">
          <span>♥</span> {p.likes}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">조회 {p.views}</span>
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 font-medium">삭제</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareForm({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ nickname: "익명 사장님", industry: "cafe", title: "", total_sales: "", profit: "", net_profit: "", net_margin: "", cogs_ratio: "", labor_ratio: "", memo: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.title || !form.total_sales) return alert("제목과 매출을 입력해주세요.");
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    await sb.from("simulation_shares").insert({
      user_id: userId, ...form,
      total_sales: Number(form.total_sales), profit: Number(form.profit),
      net_profit: Number(form.net_profit), net_margin: Number(form.net_margin),
      cogs_ratio: Number(form.cogs_ratio), labor_ratio: Number(form.labor_ratio),
    });
    setLoading(false);
    onDone();
  };

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm space-y-4">
      <h3 className="font-bold text-slate-900">내 수익 공유하기</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="닉네임 (예: 홍대카페 사장)" value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          {Object.entries(INDUSTRY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          placeholder="제목 (예: 홍대 카페 3년차 현황 공유)" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        {[
          { key: "total_sales", label: "월 총 매출 (원)" },
          { key: "net_profit", label: "세후 실수령 (원)" },
          { key: "net_margin", label: "순이익률 (%)" },
          { key: "cogs_ratio", label: "원가율 (%)" },
        ].map(({ key, label }) => (
          <input key={key} type="number" placeholder={label}
            value={form[key as keyof typeof form]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        ))}
        <textarea placeholder="한 마디 (선택) — 요즘 어떤가요?" value={form.memo}
          onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
          className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none h-20" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
        <button onClick={submit} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {loading ? "공유 중..." : "공유하기"}
        </button>
      </div>
    </div>
  );
}

// ─── 게시판 탭 ─────────────────────────────────────────────────
type BoardPost = {
  id: string; user_id?: string; nickname: string; category: string; industry: string;
  title: string; content: string; likes: number; views: number;
  comment_count: number; created_at: string;
};

function BoardTab({ userId, isAdmin }: { userId: string | null; isAdmin: boolean }) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [category, setCategory] = useState<BoardCategory>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BoardPost | null>(null);
  const [showWrite, setShowWrite] = useState(false);
  const router = useRouter();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    let q = sb.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (category !== "all") q = q.eq("category", category);
    const { data } = await q;
    setPosts(data ?? []);
    setLoading(false);
  }, [category]);

  const handleDeletePost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 게시글을 삭제할까요?")) return;
    const sb = createSupabaseBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("posts").delete().eq("id", id);
    if (error) { alert("삭제 실패: " + error.message); return; }
    fetchPosts();
  };

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (selected) return <PostDetail post={selected} userId={userId} onBack={() => { setSelected(null); fetchPosts(); }} />;

  const cats: { key: BoardCategory; label: string }[] = [
    { key: "all", label: "전체" }, { key: "free", label: "자유" },
    { key: "question", label: "질문" }, { key: "tip", label: "꿀팁" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {cats.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${category === c.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={() => userId ? setShowWrite(true) : router.push("/login?next=/community")}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
          글쓰기
        </button>
      </div>

      {showWrite && userId && <WritePostForm userId={userId} onDone={() => { setShowWrite(false); fetchPosts(); }} onCancel={() => setShowWrite(false)} />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : posts.length === 0 ? (
        <EmptyState icon="📝" text="아직 게시글이 없어요" sub="첫 번째 글을 남겨보세요" />
      ) : (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
          {posts.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[p.category] ?? "bg-slate-100 text-slate-600"}`}>
                  {CATEGORY_LABELS[p.category] ?? p.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{p.nickname} · {new Date(p.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-xs text-slate-400">
                  <span>💬 {p.comment_count}</span>
                  <span>♥ {p.likes}</span>
                  {(userId && p.user_id === userId || isAdmin) && (
                    <span onClick={e => handleDeletePost(p.id, e)} className="text-red-400 hover:text-red-600 font-medium cursor-pointer">삭제</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WritePostForm({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ nickname: "익명", category: "free", title: "", content: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert("제목과 내용을 입력해주세요.");
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    await sb.from("posts").insert({ user_id: userId, ...form });
    setLoading(false);
    onDone();
  };

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-900">글쓰기</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="닉네임" value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="free">자유</option>
          <option value="question">질문</option>
          <option value="tip">꿀팁</option>
        </select>
      </div>
      <input placeholder="제목" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      <textarea placeholder="내용을 입력하세요..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none h-32" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
        <button onClick={submit} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {loading ? "등록 중..." : "등록"}
        </button>
      </div>
    </div>
  );
}

type Comment = { id: string; nickname: string; content: string; likes: number; is_ai?: boolean; created_at: string };

function PostDetail({ post, userId, onBack }: { post: BoardPost; userId: string | null; onBack: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState("익명");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.from("comments").select("*").eq("post_id", post.id).order("created_at").then(({ data }: { data: Comment[] | null }) => setComments(data ?? []));
    sb.rpc("increment_views", { table_name: "posts", row_id: post.id });
  }, [post.id]);

  const submitComment = async () => {
    if (!userId) { router.push("/login?next=/community"); return; }
    if (!input.trim()) return;
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    await sb.from("comments").insert({ post_id: post.id, user_id: userId, nickname, content: input });
    await sb.from("posts").update({ comment_count: post.comment_count + comments.length + 1 }).eq("id", post.id);
    setInput("");
    const { data } = await sb.from("comments").select("*").eq("post_id", post.id).order("created_at");
    setComments(data ?? []);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        ← 목록으로
      </button>
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[post.category]}`}>{CATEGORY_LABELS[post.category]}</span>
        <h2 className="mt-3 text-xl font-bold text-slate-900">{post.title}</h2>
        <p className="mt-1 text-xs text-slate-400">{post.nickname} · {new Date(post.created_at).toLocaleDateString("ko-KR")}</p>
        <p className="mt-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-4">
        <h3 className="font-bold text-slate-900">댓글 {comments.length}개</h3>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">첫 댓글을 남겨보세요</p>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100">
            {comments.map(c => (
              <div key={c.id} className="pt-3 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">{c.nickname}</span>
                  {c.is_ai && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">AI</span>}
                  <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <input placeholder="닉네임" value={nickname} onChange={e => setNickname(e.target.value)}
            className="w-24 shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <input placeholder="댓글을 입력하세요..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <button onClick={submitComment} disabled={loading}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {loading ? "..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 익명 상담 탭 ──────────────────────────────────────────────
type AnonPost = {
  id: string; user_id?: string; industry: string; title: string; content: string;
  likes: number; comment_count: number; created_at: string;
};

function AnonymousTab({ userId, isAdmin }: { userId: string | null; isAdmin: boolean }) {
  const [posts, setPosts] = useState<AnonPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnonPost | null>(null);
  const [showWrite, setShowWrite] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    const { data } = await sb.from("anonymous_posts").select("*").order("created_at", { ascending: false }).limit(50);
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 게시글을 삭제할까요?")) return;
    const sb = createSupabaseBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("anonymous_posts").delete().eq("id", id);
    if (error) { alert("삭제 실패: " + error.message); return; }
    fetchPosts();
  };

  if (selected) return <AnonDetail post={selected} userId={userId} onBack={() => { setSelected(null); fetchPosts(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-amber-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-amber-700">🔒 익명 보장 — 닉네임 없이 고민을 나눠요</p>
        </div>
        <button onClick={() => setShowWrite(true)}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
          고민 올리기
        </button>
      </div>

      {showWrite && <WriteAnonForm userId={userId} onDone={() => { setShowWrite(false); fetchPosts(); }} onCancel={() => setShowWrite(false)} />}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>
      ) : posts.length === 0 ? (
        <EmptyState icon="🤫" text="아직 익명 상담이 없어요" sub="고민을 익명으로 올려보세요. AI가 먼저 답변해드려요" />
      ) : (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
          {posts.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{INDUSTRY_ICONS[p.industry] ?? "🏪"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">익명 · {new Date(p.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">💬 {p.comment_count}</span>
                  {(userId && p.user_id === userId || isAdmin) && (
                    <span onClick={e => handleDelete(p.id, e)} className="text-xs text-red-400 hover:text-red-600 font-medium cursor-pointer">삭제</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WriteAnonForm({ userId, onDone, onCancel }: { userId: string | null; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ industry: "restaurant", title: "", content: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert("제목과 내용을 입력해주세요.");
    setLoading(true);
    const sb = createSupabaseBrowserClient();
    const { data } = await sb.from("anonymous_posts").insert({ user_id: userId ?? null, ...form }).select("id").single();
    // 백그라운드에서 AI 답변 생성 (fire-and-forget)
    if (data?.id) {
      fetch("/api/anon-ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.id }),
      }).catch(() => {});
    }
    setLoading(false);
    onDone();
  };

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-slate-900">익명 고민 올리기</h3>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">익명</span>
      </div>
      <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {Object.entries(INDUSTRY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input placeholder="제목 (예: 원가율이 40%인데 정상인가요?)" value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      <textarea placeholder="자세한 상황을 적어주세요. AI가 먼저 답변해드려요." value={form.content}
        onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none h-28" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
        <button onClick={submit} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {loading ? "등록 중..." : "익명으로 올리기"}
        </button>
      </div>
    </div>
  );
}

type AnonComment = { id: string; content: string; is_ai: boolean; created_at: string };

function AnonDetail({ post, userId, onBack }: { post: AnonPost; userId: string | null; onBack: () => void }) {
  const [comments, setComments] = useState<AnonComment[]>([]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadComments = useCallback(async () => {
    const sb = createSupabaseBrowserClient();
    const { data } = await sb.from("anonymous_comments").select("*").eq("post_id", post.id).order("created_at");
    setComments(data ?? []);

    const hasAI = (data ?? []).some((c: AnonComment) => c.is_ai);
    if (!hasAI) {
      // AI 답변이 없으면 서버에 생성 요청 + 폴링
      setAiLoading(true);
      fetch("/api/anon-ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).catch(() => {});

      // 3초마다 AI 답변이 들어왔는지 확인
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          const { data: fresh } = await sb.from("anonymous_comments").select("*").eq("post_id", post.id).order("created_at");
          if (fresh && fresh.some((c: AnonComment) => c.is_ai)) {
            setComments(fresh);
            setAiLoading(false);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        }, 3000);
      }
    } else {
      setAiLoading(false);
    }
  }, [post.id]);

  useEffect(() => { loadComments(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, [loadComments]);

  const submitComment = async () => {
    if (!input.trim()) return;
    setSubmitting(true);
    const sb = createSupabaseBrowserClient();
    await sb.from("anonymous_comments").insert({ post_id: post.id, user_id: userId ?? null, content: input, is_ai: false });
    await sb.from("anonymous_posts").update({ comment_count: comments.length + 1 }).eq("id", post.id);
    setInput("");
    await loadComments();
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">← 목록으로</button>
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{INDUSTRY_ICONS[post.industry] ?? "🏪"}</span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">익명</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
        <p className="mt-1 text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString("ko-KR")}</p>
        <p className="mt-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-4">
        <h3 className="font-bold text-slate-900">답변 {comments.length}개</h3>
        {aiLoading && (
          <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <span className="text-sm text-blue-600">VELA AI가 답변을 작성하고 있어요...</span>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className={`rounded-2xl px-4 py-3 ${c.is_ai ? "bg-blue-50" : "bg-slate-50"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {c.is_ai
                ? <span className="text-xs font-bold text-blue-600">🤖 VELA AI</span>
                : <span className="text-xs font-semibold text-slate-600">익명</span>}
              <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input placeholder="익명으로 답변하기..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <button onClick={submitComment} disabled={submitting}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {submitting ? "..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 벤치마크 탭 ───────────────────────────────────────────────
function BenchmarkTab() {
  const industries = ["cafe", "restaurant", "bar", "finedining"] as const;
  const metrics = [
    { key: "cogsRate" as const, label: "평균 원가율", suffix: "%" },
    { key: "laborRate" as const, label: "평균 인건비율", suffix: "%" },
    { key: "rentRate" as const, label: "평균 임대료율", suffix: "%" },
    { key: "netMargin" as const, label: "평균 순이익률", suffix: "%" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500">외식업 업종별 평균 수치 — VELA 분석 데이터 기반</p>
      </div>

      {/* 업종별 카드 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {industries.map(ind => {
          const b = INDUSTRY_BENCHMARK[ind];
          return (
            <div key={ind} className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{INDUSTRY_ICONS[ind]}</span>
                <h3 className="font-bold text-slate-900">{INDUSTRY_LABELS[ind]}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map(({ key, label }) => (
                  <div key={key} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{b[key]}{}</p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${Math.min(b[key], 50) * 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href={`/simulator?industry=${ind}`}
                className="mt-4 block w-full rounded-xl bg-slate-900 py-2 text-center text-xs font-semibold text-white hover:bg-slate-700">
                {INDUSTRY_LABELS[ind]}으로 시뮬레이션 →
              </Link>
            </div>
          );
        })}
      </div>

      {/* 비교표 */}
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 overflow-x-auto">
        <h3 className="font-bold text-slate-900 mb-4">업종별 비교표</h3>
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-xs font-semibold text-slate-400 w-28">업종</th>
              {metrics.map(m => <th key={m.key} className="text-right py-2 text-xs font-semibold text-slate-400">{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {industries.map(ind => {
              const b = INDUSTRY_BENCHMARK[ind];
              return (
                <tr key={ind} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 font-semibold text-slate-800">{INDUSTRY_ICONS[ind]} {INDUSTRY_LABELS[ind]}</td>
                  {metrics.map(({ key }) => (
                    <td key={key} className="py-3 text-right font-mono text-slate-700">{b[key]}%</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────
export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").split(",").map(e => e.trim().toLowerCase());

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }: { data: { user: { id: string; email?: string } | null } }) => {
      setUserId(data.user?.id ?? null);
      const email = data.user?.email ?? "";
      setIsAdmin(ADMIN_EMAILS.includes(email));
    });
  }, []);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "feed", label: "수익 피드", icon: "📊" },
    { key: "board", label: "게시판", icon: "📝" },
    { key: "anonymous", label: "익명 상담", icon: "🤫" },
    { key: "benchmark", label: "벤치마크", icon: "📈" },
  ];

  return (
    <>
      
      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">

          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">사장님 커뮤니티</h1>
            <p className="mt-2 text-slate-500">수익을 공유하고, 고민을 나누고, 업종 평균을 확인하세요.</p>
          </div>

          {/* 탭 */}
          <div className="mb-6 flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${tab === t.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                <span className="mr-1.5">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          {tab === "feed" && <FeedTab userId={userId} isAdmin={isAdmin} />}
          {tab === "board" && <BoardTab userId={userId} isAdmin={isAdmin} />}
          {tab === "anonymous" && <AnonymousTab userId={userId} isAdmin={isAdmin} />}
          {tab === "benchmark" && <BenchmarkTab />}

        </div>
      </main>
    </>
  );
}
