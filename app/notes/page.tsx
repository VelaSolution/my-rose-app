"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

/* ── types ── */
type Mood = "good" | "normal" | "bad";

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: Mood;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface NotesData {
  journal: JournalEntry[];
  todos: TodoItem[];
  memo: string;
}

const STORAGE_KEY = "vela-owner-notes";
const MOOD_MAP: Record<Mood, { emoji: string; label: string }> = {
  good:   { emoji: "😊", label: "좋음" },
  normal: { emoji: "😐", label: "보통" },
  bad:    { emoji: "😞", label: "나쁨" },
};

const TABS = [
  { key: "journal", label: "매장 운영 일지", icon: "📒" },
  { key: "todo",    label: "할 일 체크리스트", icon: "✅" },
  { key: "memo",    label: "메모장", icon: "📝" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadData(): NotesData {
  if (typeof window === "undefined") return { journal: [], todos: [], memo: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { journal: [], todos: [], memo: "" };
}

export function NotesWidget() {
  const [data, setData] = useState<NotesData>({ journal: [], todos: [], memo: "" });
  const [tab, setTab] = useState<TabKey>("journal");
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loaded = useRef(false);

  const userRef = useRef<string | null>(null);

  /* load: localStorage 먼저, 로그인 시 클라우드 우선 */
  useEffect(() => {
    const local = loadData();
    setData(local);
    loaded.current = true;

    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      userRef.current = user.id;
      const { data: cloud } = await sb.from("user_notes").select("data").eq("user_id", user.id).limit(1);
      if (cloud && cloud.length > 0) {
        try {
          const parsed = JSON.parse(cloud[0].data);
          setData(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch { /* use local */ }
      } else if (local.journal.length > 0 || local.todos.length > 0 || local.memo) {
        await sb.from("user_notes").insert({ user_id: user.id, data: JSON.stringify(local) });
      }
    })();
  }, []);

  /* auto-save: localStorage + 클라우드 */
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useCallback((next: NotesData) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 1200);

    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(async () => {
      if (!userRef.current) return;
      const sb = createSupabaseBrowserClient();
      const payload = { user_id: userRef.current, data: JSON.stringify(next) };
      const { data: existing } = await sb.from("user_notes").select("id").eq("user_id", userRef.current).limit(1);
      if (existing && existing.length > 0) {
        await sb.from("user_notes").update(payload).eq("user_id", userRef.current);
      } else {
        await sb.from("user_notes").insert(payload);
      }
    }, 2000);
  }, []);

  /* ── journal helpers ── */
  const [jDate, setJDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [jContent, setJContent] = useState("");
  const [jMood, setJMood] = useState<Mood>("normal");

  function addJournal() {
    if (!jContent.trim()) return;
    const entry: JournalEntry = { id: uid(), date: jDate, content: jContent.trim(), mood: jMood };
    save({ ...data, journal: [entry, ...data.journal] });
    setJContent("");
  }

  function deleteJournal(id: string) {
    save({ ...data, journal: data.journal.filter((e) => e.id !== id) });
  }

  /* ── todo helpers ── */
  const [newTodo, setNewTodo] = useState("");

  function addTodo() {
    if (!newTodo.trim()) return;
    save({ ...data, todos: [...data.todos, { id: uid(), text: newTodo.trim(), done: false }] });
    setNewTodo("");
  }

  function toggleTodo(id: string) {
    save({ ...data, todos: data.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  }

  function deleteTodo(id: string) {
    save({ ...data, todos: data.todos.filter((t) => t.id !== id) });
  }

  /* ── memo helper ── */
  function onMemoChange(v: string) {
    save({ ...data, memo: v });
  }

  return (
    <div>
      {/* toast */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        저장됨
      </div>

        {/* tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ──────── journal ──────── */}
        {tab === "journal" && (
          <section className="space-y-4">
            {/* input card */}
            <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-5 space-y-4">
              <div className="flex gap-3 items-center">
                <input
                  type="date"
                  value={jDate}
                  onChange={(e) => setJDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <div className="flex gap-1">
                  {(Object.keys(MOOD_MAP) as Mood[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setJMood(m)}
                      className={`w-9 h-9 rounded-full text-lg flex items-center justify-center transition-all ${
                        jMood === m ? "ring-2 ring-slate-900 scale-110" : "opacity-50 hover:opacity-80"
                      }`}
                      title={MOOD_MAP[m].label}
                    >
                      {MOOD_MAP[m].emoji}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={jContent}
                onChange={(e) => setJContent(e.target.value)}
                placeholder="오늘 매장에서 있었던 일을 기록하세요..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400"
              />
              <button
                onClick={addJournal}
                disabled={!jContent.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
              >
                기록 추가
              </button>
            </div>

            {/* entries */}
            {data.journal.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">아직 작성한 일지가 없어요.</p>
            )}
            {data.journal.map((e) => (
              <div key={e.id} className="bg-white rounded-3xl ring-1 ring-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{e.date}</span>
                    <span>{MOOD_MAP[e.mood].emoji}</span>
                  </div>
                  <button
                    onClick={() => deleteJournal(e.id)}
                    className="text-slate-400 hover:text-red-500 text-xs transition-colors"
                  >
                    삭제
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{e.content}</p>
              </div>
            ))}
          </section>
        )}

        {/* ──────── todo ──────── */}
        {tab === "todo" && (
          <section className="space-y-4">
            {/* add */}
            <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTodo();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="할 일을 입력하세요..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newTodo.trim()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
                >
                  추가
                </button>
              </form>
            </div>

            {/* list */}
            {data.todos.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">할 일이 없어요. 위에서 추가해보세요!</p>
            )}
            <div className="bg-white rounded-3xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
              {data.todos.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 group">
                  <button
                    onClick={() => toggleTodo(t.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      t.done ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {t.done && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm transition-colors ${
                      t.done ? "line-through text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="text-slate-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ──────── memo ──────── */}
        {tab === "memo" && (
          <section>
            <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-5">
              <textarea
                value={data.memo}
                onChange={(e) => onMemoChange(e.target.value)}
                placeholder="자유롭게 메모하세요... 자동 저장됩니다."
                rows={16}
                className="w-full text-sm text-slate-700 resize-none focus:outline-none placeholder:text-slate-400 leading-relaxed"
              />
            </div>
          </section>
        )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Pretendard, sans-serif" }}>
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">노트</h1>
        <p className="text-sm text-slate-500 mb-6">매장 운영에 필요한 기록을 한곳에서 관리하세요.</p>
        <NotesWidget />
      </main>
    </div>
  );
}
