"use client";
import { useState, useEffect } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, today, I, C, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

type Kudos = {
  id: string; from_name: string; to_name: string; message: string;
  emoji: string; created_at: string; category?: string;
};

const EMOJIS = ["👏", "🌟", "💪", "🔥", "❤️", "🎉", "🏆", "💎"];

const CATEGORIES = [
  { key: "업무성과", color: "bg-emerald-50 text-emerald-700", icon: "📈" },
  { key: "팀워크", color: "bg-blue-50 text-blue-700", icon: "🤝" },
  { key: "리더십", color: "bg-purple-50 text-purple-700", icon: "🎯" },
  { key: "창의성", color: "bg-amber-50 text-amber-700", icon: "💡" },
  { key: "도움", color: "bg-pink-50 text-pink-700", icon: "🙌" },
  { key: "기타", color: "bg-slate-50 text-slate-600", icon: "✨" },
] as const;

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void; }

export default function KudosTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [kudosList, setKudosList] = useState<Kudos[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toName, setToName] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("👏");
  const [category, setCategory] = useState<string>("업무성과");
  const [viewTab, setViewTab] = useState<"all" | "received" | "sent">("all");

  const load = async () => {
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_kudos").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setKudosList(data as Kudos[]);
    const { data: td } = await s.from("hq_team").select("name").neq("approved", false);
    if (td) setTeamNames((td as { name: string }[]).map(t => t.name).filter(n => n !== userName));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!toName || !message.trim()) { flash("대상과 메시지를 입력해주세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_kudos").insert({ from_name: userName, to_name: toName, message: message.trim(), emoji, category });
    flash("칭찬이 전달되었습니다!"); setShowForm(false); setMessage(""); setToName(""); setCategory("업무성과");
    load();
  };

  const deleteKudos = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_kudos").delete().eq("id", id);
    flash("칭찬이 삭제되었습니다");
    load();
  };

  function canDelete(k: Kudos): boolean {
    if (k.from_name !== userName) return false;
    if (!k.created_at) return false;
    const created = new Date(k.created_at).getTime();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;
    return (now - created) < hours24;
  }

  // 이번 달 받은 칭찬 랭킹
  const thisMonth = today().slice(0, 7);
  const monthKudos = kudosList.filter(k => k.created_at?.startsWith(thisMonth));
  const ranking: Record<string, number> = {};
  monthKudos.forEach(k => { ranking[k.to_name] = (ranking[k.to_name] || 0) + 1; });
  const topRanking = Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 내가 받은/보낸 통계
  const receivedCount = kudosList.filter(k => k.to_name === userName).length;
  const sentCount = kudosList.filter(k => k.from_name === userName).length;

  // 뷰 탭별 필터링
  const displayKudos = viewTab === "received"
    ? kudosList.filter(k => k.to_name === userName)
    : viewTab === "sent"
    ? kudosList.filter(k => k.from_name === userName)
    : kudosList;

  function categoryBadge(cat: string | undefined) {
    if (!cat) return null;
    const c = CATEGORY_MAP[cat];
    if (!c) return null;
    return <span className={`${BADGE} text-[10px] ${c.color}`}>{c.icon} {cat}</span>;
  }

  return (
    <div className="space-y-4">
      {/* 내 통계 */}
      <div className="flex gap-3">
        <div className={`${C} flex-1 !p-4 text-center`}>
          <p className="text-2xl font-bold text-[#3182F6]">{receivedCount}</p>
          <p className="text-xs text-slate-500 mt-1">받은 칭찬</p>
        </div>
        <div className={`${C} flex-1 !p-4 text-center`}>
          <p className="text-2xl font-bold text-emerald-500">{sentCount}</p>
          <p className="text-xs text-slate-500 mt-1">보낸 칭찬</p>
        </div>
      </div>

      {/* 이번 달 랭킹 */}
      {topRanking.length > 0 && (
        <div className={C}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">🏆 이번 달 칭찬 랭킹</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {topRanking.map(([name, count], i) => (
              <div key={name} className="flex flex-col items-center gap-1 min-w-[72px]">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-600"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : name[0]}
                </div>
                <p className="text-xs font-semibold text-slate-800">{name}</p>
                <p className="text-[10px] text-slate-400">{count}회</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 칭찬 보내기 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">동료 칭찬</h3>
        <button onClick={() => setShowForm(!showForm)} className={B}>
          {showForm ? "취소" : "👏 칭찬 보내기"}
        </button>
      </div>

      {showForm && (
        <div className={C}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">누구에게?</label>
              <select className={I} value={toName} onChange={e => setToName(e.target.value)}>
                <option value="">선택하세요</option>
                {teamNames.map(n => <option key={n} value={n}>{displayName(n)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">카테고리</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`${BADGE} text-[10px] transition-all cursor-pointer ${
                      category === c.key
                        ? c.color + " ring-2 ring-offset-1 ring-blue-300"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {c.icon} {c.key}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">이모지</label>
              <div className="flex gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-lg transition active:scale-95 ${emoji === e ? "bg-[#3182F6]/10 ring-2 ring-[#3182F6]" : "bg-slate-50 hover:bg-slate-100"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">칭찬 메시지</label>
              <textarea className={`${I} min-h-[60px]`} rows={2} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="예) 어제 야근하면서 프로젝트 마감 지켜줘서 고마워요!" />
            </div>
            <div className="flex justify-end">
              <button onClick={submit} className={B}>보내기</button>
            </div>
          </div>
        </div>
      )}

      {/* 뷰 탭: 전체 / 내가 받은 / 내가 보낸 */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {([
          { key: "all" as const, label: "전체" },
          { key: "received" as const, label: "내가 받은" },
          { key: "sent" as const, label: "내가 보낸" },
        ]).map(tab => (
          <button
            key={tab.key}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => setViewTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 칭찬 피드 */}
      <div className="space-y-2">
        {displayKudos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span className="text-4xl block mb-2">👏</span>
            <p className="text-sm">
              {viewTab === "received" ? "아직 받은 칭찬이 없어요." : viewTab === "sent" ? "아직 보낸 칭찬이 없어요." : "아직 칭찬이 없어요. 첫 번째 칭찬을 보내보세요!"}
            </p>
          </div>
        ) : displayKudos.map(k => (
          <div key={k.id} className={`${C} !p-4`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{k.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">{displayName(k.from_name)}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="font-bold text-[#3182F6]">{displayName(k.to_name)}</span>
                  </p>
                  {categoryBadge(k.category)}
                </div>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{k.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[10px] text-slate-400">
                    {k.created_at ? new Date(k.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                  {canDelete(k) && (
                    <button
                      className="text-[10px] text-red-400 hover:text-red-600"
                      onClick={() => deleteKudos(k.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
