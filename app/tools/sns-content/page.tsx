"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useSimulatorData } from "@/lib/useSimulatorData";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PlanGate from "@/components/PlanGate";
import { fmt } from "@/lib/vela";

type Tone = "warm" | "trendy" | "professional" | "fun";
type Platform = "instagram" | "naver-blog" | "kakao";
type DataSource = "none" | "simulator" | "monthly";
type MonthSnap = { month: string; total_sales: number; net_profit: number; industry?: string };
type SimHistory = { id: string; label: string; form: Record<string, number | string>; result: Record<string, number> };

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: "warm", label: "따뜻한", desc: "친근하고 감성적인 톤" },
  { id: "trendy", label: "트렌디", desc: "MZ 감성, 짧고 임팩트" },
  { id: "professional", label: "전문적", desc: "신뢰감 있는 공식 톤" },
  { id: "fun", label: "유쾌한", desc: "이모지·말장난 활용" },
];

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: "instagram", label: "인스타그램", icon: "📸" },
  { id: "naver-blog", label: "네이버 블로그", icon: "📝" },
  { id: "kakao", label: "카카오채널", icon: "💛" },
];

const CONTENT_TYPES = ["신메뉴 소개", "이벤트·할인", "시즌 한정", "재료 이야기", "매장 소식", "리뷰 감사", "일상 공유"];

const INDUSTRY_LABEL: Record<string, string> = {
  cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};

export default function SnsContentPage() {
  const simData = useSimulatorData();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => setIsLoggedIn(!!data.user));
  }, []);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tone, setTone] = useState<Tone>("warm");
  const [contentType, setContentType] = useState("신메뉴 소개");
  const [menuName, setMenuName] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(simData ? "simulator" : "none");
  const [monthlySnaps, setMonthlySnaps] = useState<MonthSnap[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [simList, setSimList] = useState<SimHistory[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string>("");

  // 저장된 데이터 불러오기
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      sb.from("monthly_snapshots").select("month,total_sales,net_profit,industry")
        .eq("user_id", user.id).order("month", { ascending: false }).limit(12)
        .then(({ data }: { data: MonthSnap[] | null }) => {
          if (data && data.length > 0) { setMonthlySnaps(data); setSelectedMonth(data[0].month); }
        });
      sb.from("simulation_history").select("id,label,form,result")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
        .then(({ data }: { data: SimHistory[] | null }) => {
          if (data && data.length > 0) { setSimList(data); setSelectedSimId(data[0].id); }
        });
    });
  }, []);

  const toneLabels: Record<Tone, string> = {
    warm: "따뜻하고 감성적인",
    trendy: "트렌디하고 임팩트 있는",
    professional: "전문적이고 신뢰감 있는",
    fun: "유쾌하고 이모지를 적극 활용하는",
  };

  const platformLabels: Record<Platform, string> = {
    instagram: "인스타그램 (짧고 감성적, 해시태그 20개 이내, 줄바꿈 활용)",
    "naver-blog": "네이버 블로그 (SEO 최적화, 키워드 자연스럽게 포함, 800~1200자)",
    kakao: "카카오채널 (간결하고 행동 유도 문구 포함, 300자 이내)",
  };

  // 데이터 소스에 따른 컨텍스트
  const selectedSnap = monthlySnaps.find((s) => s.month === selectedMonth);
  const selectedSim = simList.find((s) => s.id === selectedSimId);
  let dataContext = "";
  if (dataSource === "simulator") {
    // 저장된 시뮬레이션 선택 시 우선, 없으면 최신 localStorage
    const src = selectedSim ? {
      industry: String(selectedSim.form.industry ?? ""),
      totalSales: Number(selectedSim.result.totalSales ?? 0),
      avgSpend: Number(selectedSim.form.avgSpend ?? 0),
      netMargin: Number(selectedSim.result.netMargin ?? 0),
    } : simData ? {
      industry: simData.industry,
      totalSales: simData.totalSales,
      avgSpend: simData.avgSpend,
      netMargin: simData.netMargin,
    } : null;

    if (src) {
      dataContext = `\n[매장 정보 (시뮬레이터 데이터)]\n업종: ${INDUSTRY_LABEL[src.industry] ?? src.industry}\n월 매출: ${fmt(src.totalSales)}원 / 객단가: ${fmt(src.avgSpend)}원\n순이익률: ${src.netMargin}%\n이 매장의 가격대와 타겟 고객층에 맞는 콘텐츠를 작성하세요. 객단가가 ${src.avgSpend > 15000 ? "높은 편이므로 프리미엄·품질 중심 톤" : src.avgSpend > 8000 ? "보통이므로 가성비·일상 톤" : "낮은 편이므로 접근성·가벼운 톤"}으로 작성하세요.\n`;
    }
  } else if (dataSource === "monthly" && selectedSnap) {
    const margin = selectedSnap.total_sales > 0 ? ((selectedSnap.net_profit / selectedSnap.total_sales) * 100).toFixed(1) : "0";
    dataContext = `\n[매장 정보 (${selectedSnap.month} 실제 매출)]\n업종: ${INDUSTRY_LABEL[selectedSnap.industry ?? ""] ?? "외식업"}\n월 매출: ${fmt(selectedSnap.total_sales)}원\n순이익: ${fmt(selectedSnap.net_profit)}원 (순이익률 ${margin}%)\n실제 운영 데이터 기반이므로 현실적인 톤으로 콘텐츠를 작성하세요.\n`;
  }

  async function generate() {
    if (!menuName && !description) return;
    if (!isLoggedIn) {
      window.location.href = "/login?next=/tools/sns-content";
      return;
    }
    setLoading(true);
    setResult("");

    const prompt = `당신은 외식업 전문 SNS 마케터입니다.
아래 정보를 바탕으로 ${platformLabels[platform]} 플랫폼에 최적화된 게시글을 작성하세요.
${dataContext}
[콘텐츠 정보]
콘텐츠 유형: ${contentType}
메뉴/이벤트명: ${menuName || "(없음)"}
상세 내용: ${description || "(없음)"}
추가 해시태그 요청: ${hashtags || "(없음)"}

[작성 조건]
- 톤: ${toneLabels[tone]}
- 플랫폼: ${platformLabels[platform]}
- 외식업 매장 운영자가 직접 올리는 게시글처럼 자연스럽게
- 광고 느낌 최소화, 진정성 있게
- 마지막에 해시태그 포함 (인스타의 경우)

게시글만 작성하세요. 설명, 제목, 마크다운 없이 바로 시작.`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 전문 SNS 마케터입니다. 사용자의 요청에 맞게 감성적이고 실용적인 SNS 게시글을 작성합니다. 요청한 플랫폼과 톤에 맞게 자연스럽게 작성하세요.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);
      setResult(data.text ?? "");
    } catch (e) {
      setResult(`콘텐츠 생성 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "다시 시도해주세요."}`);
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ToolNav />
      <PlanGate>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📱</span> AI 콘텐츠 생성기
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">SNS 콘텐츠 생성기</h1>
            <p className="text-slate-500 text-sm">메뉴·이벤트 정보를 입력하면 AI가 맞춤 SNS 게시글을 작성해드립니다.</p>
          </div>

          {/* 데이터 소스 선택 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-6">
            <h2 className="font-bold text-slate-900 mb-3">📊 매장 데이터 연동</h2>
            <p className="text-xs text-slate-500 mb-4">데이터를 연동하면 내 매장 객단가·업종·매출에 맞는 맞춤 콘텐츠가 생성됩니다.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setDataSource("none")}
                className={`rounded-2xl py-3 text-center transition border-2 ${
                  dataSource === "none" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <div className="text-lg mb-1">✏️</div>
                <div className="text-xs font-semibold">직접 입력</div>
              </button>
              <button
                onClick={() => (simData || simList.length > 0) ? setDataSource("simulator") : undefined}
                className={`rounded-2xl py-3 text-center transition border-2 ${
                  dataSource === "simulator" ? "border-blue-500 bg-blue-50 text-blue-700" : (simData || simList.length > 0) ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50" : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                }`}
              >
                <div className="text-lg mb-1">🧮</div>
                <div className="text-xs font-semibold">시뮬레이터</div>
                {!simData && simList.length === 0 && <div className="text-[10px] text-slate-400 mt-0.5">데이터 없음</div>}
                {simList.length > 0 && <div className="text-[10px] text-blue-500 mt-0.5">{simList.length}개 저장됨</div>}
              </button>
              <button
                onClick={() => monthlySnaps.length > 0 ? setDataSource("monthly") : undefined}
                className={`rounded-2xl py-3 text-center transition border-2 ${
                  dataSource === "monthly" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : monthlySnaps.length > 0 ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50" : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                }`}
              >
                <div className="text-lg mb-1">📈</div>
                <div className="text-xs font-semibold">월별 매출</div>
                {monthlySnaps.length === 0 && <div className="text-[10px] text-slate-400 mt-0.5">데이터 없음</div>}
              </button>
            </div>

            {/* 선택된 소스의 상세 정보 */}
            {dataSource === "simulator" && (
              <div className="space-y-2">
                {simList.length > 0 && (
                  <select
                    value={selectedSimId}
                    onChange={(e) => setSelectedSimId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {simList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — 매출 {fmt(Number(s.result.totalSales ?? 0))}원
                      </option>
                    ))}
                  </select>
                )}
                {(() => {
                  const src = selectedSim ? {
                    industry: String(selectedSim.form.industry ?? ""),
                    totalSales: Number(selectedSim.result.totalSales ?? 0),
                    avgSpend: Number(selectedSim.form.avgSpend ?? 0),
                    netMargin: Number(selectedSim.result.netMargin ?? 0),
                  } : simData ? { industry: simData.industry, totalSales: simData.totalSales, avgSpend: simData.avgSpend, netMargin: simData.netMargin } : null;
                  return src ? (
                    <div className="rounded-2xl bg-blue-50 px-4 py-3">
                      <div className="flex gap-3 flex-wrap text-xs">
                        <span className="text-blue-600 font-semibold">{INDUSTRY_LABEL[src.industry] ?? src.industry}</span>
                        <span className="text-blue-800">월매출 {fmt(src.totalSales)}원</span>
                        <span className="text-blue-800">객단가 {fmt(src.avgSpend)}원</span>
                        <span className="text-blue-800">순이익률 {src.netMargin}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">시뮬레이터를 먼저 실행해주세요.</p>
                    </div>
                  );
                })()}
              </div>
            )}
            {dataSource === "monthly" && monthlySnaps.length > 0 && (
              <div className="space-y-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {monthlySnaps.map((s) => (
                    <option key={s.month} value={s.month}>
                      {s.month} — 매출 {fmt(s.total_sales)}원 / 순이익 {fmt(s.net_profit)}원
                    </option>
                  ))}
                </select>
                {selectedSnap && (
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <div className="flex gap-3 flex-wrap text-xs">
                      <span className="text-emerald-600 font-semibold">{selectedSnap.month} 실제 데이터</span>
                      <span className="text-emerald-800">매출 {fmt(selectedSnap.total_sales)}원</span>
                      <span className="text-emerald-800">순이익 {fmt(selectedSnap.net_profit)}원</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {dataSource === "none" && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">데이터 없이 일반적인 외식업 콘텐츠로 생성합니다.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 입력 */}
            <div className="space-y-5">
              {/* 플랫폼 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">플랫폼 선택</h2>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`rounded-2xl py-3 text-center transition ${
                        platform === p.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xl mb-1">{p.icon}</div>
                      <div className="text-xs font-semibold">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 콘텐츠 유형 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-3">
                <h2 className="font-bold text-slate-900">콘텐츠 유형</h2>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setContentType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        contentType === t ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 톤 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-3">
                <h2 className="font-bold text-slate-900">글 톤</h2>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`rounded-2xl py-3 px-4 text-left transition ${
                        tone === t.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-sm font-bold">{t.label}</div>
                      <div className={`text-xs mt-0.5 ${tone === t.id ? "text-slate-300" : "text-slate-400"}`}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 상세 입력 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">상세 정보</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">메뉴 / 이벤트명</label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder="예) 딸기 라떼, 오픈 1주년 이벤트"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">내용 설명</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="예) 국산 딸기 생크림 라떼, 한정 수량, 가격 6,500원, 3월 한 달만"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:bg-white transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">추가 해시태그 (선택)</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="예) 성수동카페, 홍대맛집"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:bg-white transition"
                  />
                </div>

                {isLoggedIn === false && (
                  <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
                    <span className="text-blue-500 text-lg">🔒</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-700">AI 생성은 로그인이 필요해요</p>
                      <p className="text-xs text-blue-500 mt-0.5">무료로 가입하면 바로 사용 가능</p>
                    </div>
                    <Link href="/login?next=/tools/sns-content" className="flex-shrink-0 rounded-xl bg-blue-500 text-white text-xs font-bold px-3 py-2 hover:bg-blue-600 transition">
                      로그인 →
                    </Link>
                  </div>
                )}

                <button
                  onClick={generate}
                  disabled={loading || (!menuName && !description)}
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      생성 중...
                    </>
                  ) : isLoggedIn === false ? "🔒 로그인 후 생성하기" : "✨ AI 게시글 생성"}
                </button>
              </div>
            </div>

            {/* 결과 */}
            <div>
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden h-full min-h-[500px] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">생성 결과</h2>
                  {result && (
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                    >
                      {copied ? (
                        <><span className="text-emerald-500">✓</span> 복사됨</>
                      ) : (
                        <>📋 복사</>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6">
                  {!result && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-5xl mb-4">✍️</div>
                      <p className="text-slate-400 text-sm">왼쪽에서 정보를 입력하고<br />생성 버튼을 눌러주세요</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-slate-400">게시글 작성 중...</p>
                    </div>
                  )}
                  {!loading && result && (
                    <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                      {result}
                    </div>
                  )}
                </div>

                {result && (
                  <div className="px-6 pb-6 flex gap-2">
                    <button
                      onClick={generate}
                      className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      🔄 다시 생성
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
                    >
                      {copied ? "✓ 복사됨" : "📋 복사하기"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 인스타그램은 첫 줄이 가장 중요합니다. 생성된 글에서 첫 문장을 더 임팩트 있게 다듬어보세요. 실제 게시 전 맞춤법 검사도 꼭 확인하세요.
          </div>
        </div>
      </main>
      </PlanGate>
    </>
  );
}
