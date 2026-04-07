"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PlanGate from "@/components/PlanGate";
import { useSimulatorData } from "@/lib/useSimulatorData";
import { fmt } from "@/lib/vela";

type ReplyTone = "apologetic" | "grateful" | "professional" | "friendly";
type Platform = "naver" | "kakao" | "google" | "baemin";

const PLATFORMS: { id: Platform; label: string; icon: string; charLimit: number }[] = [
  { id: "naver", label: "네이버", icon: "🟢", charLimit: 500 },
  { id: "kakao", label: "카카오맵", icon: "💛", charLimit: 300 },
  { id: "google", label: "구글", icon: "🔵", charLimit: 500 },
  { id: "baemin", label: "배달의민족", icon: "🟡", charLimit: 300 },
];

const TONES: { id: ReplyTone; label: string; emoji: string }[] = [
  { id: "grateful", label: "감사 중심", emoji: "🙏" },
  { id: "apologetic", label: "사과 중심", emoji: "😔" },
  { id: "professional", label: "전문적", emoji: "💼" },
  { id: "friendly", label: "친근하게", emoji: "😊" },
];

const RATING_SCENARIOS = [
  { label: "⭐⭐⭐⭐⭐ 극찬 리뷰", review: "음식이 너무 맛있었어요! 사장님도 친절하시고 분위기도 너무 좋았습니다. 다음에 또 올게요 :)" },
  { label: "⭐⭐⭐ 보통 리뷰", review: "맛은 괜찮았는데 가격이 조금 비싼 것 같아요. 서비스는 나쁘지 않았습니다." },
  { label: "⭐ 불만 리뷰", review: "음식이 너무 짰고 서비스가 불친절했어요. 재방문 의사 없습니다." },
  { label: "배달 불만", review: "배달이 너무 늦었고 음식이 식어서 왔어요. 포장도 엉망이었습니다." },
];

const INDUSTRY_LABEL: Record<string, string> = {
  cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};

export default function ReviewReplyPage() {
  const simData = useSimulatorData();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => setIsLoggedIn(!!data.user));
  }, []);

  const [platform, setPlatform] = useState<Platform>("naver");
  const [tone, setTone] = useState<ReplyTone>("grateful");
  const [review, setReview] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // 시뮬레이터 데이터로 배달 플랫폼 자동 선택
  useEffect(() => {
    if (simData?.deliveryEnabled) setPlatform("baemin");
  }, [simData]);

  const currentPlatform = PLATFORMS.find(p => p.id === platform)!;

  async function generate() {
    if (!review.trim()) return;
    setLoading(true);
    setResult("");

    const toneGuides: Record<ReplyTone, string> = {
      grateful: "감사함을 진심으로 표현하고, 재방문을 유도하는",
      apologetic: "불편에 대해 진심으로 사과하고, 개선 의지를 보여주는",
      professional: "전문적이고 차분하게, 사실 기반으로 응대하는",
      friendly: "친근하고 따뜻하게, 손님과 친구처럼 소통하는",
    };

    const simContext = simData
      ? `\n[매장 정보]\n업종: ${INDUSTRY_LABEL[simData.industry] ?? simData.industry} / 객단가: ${fmt(simData.avgSpend)}원\n`
      : "";

    const prompt = `당신은 외식업 매장 운영자입니다. 고객 리뷰에 대한 답변을 작성해주세요.
${simContext}
[답변 조건]
- 플랫폼: ${currentPlatform.label} (${currentPlatform.charLimit}자 이내)
- 톤: ${toneGuides[tone]}
- 매장명: ${storeName || "저희 매장"}
- 광고성 문구 금지, 진정성 있게
- 자연스럽고 사람이 직접 쓴 것처럼

[고객 리뷰]
${review}

답변만 작성하세요. 설명·제목 없이 바로 시작. ${currentPlatform.charLimit}자를 넘지 마세요.`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 매장 운영자입니다. 고객 리뷰에 진심 어린 답변을 작성합니다. 자연스럽고 사람이 직접 쓴 것처럼 답변하세요.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);
      setResult(data.text ?? "");
    } catch (e) {
      setResult(`답변 생성 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "다시 시도해주세요."}`);
    } finally {
      setLoading(false);
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = result.length;
  const overLimit = charCount > currentPlatform.charLimit;

  return (
    <>
      <ToolNav />
      <PlanGate>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>💬</span> AI 리뷰 답변
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">리뷰 답변 생성기</h1>
            <p className="text-slate-500 text-sm">고객 리뷰를 붙여넣으면 AI가 플랫폼·톤에 맞는 답변 초안을 작성합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 입력 */}
            <div className="space-y-5">
              {/* 플랫폼 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">플랫폼</h2>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`rounded-2xl py-3 px-2 flex flex-col items-center gap-1 text-xs font-semibold transition ${
                        platform === p.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span>{p.label}</span>
                      <span className={`text-xs ${platform === p.id ? "text-slate-400" : "text-slate-300"}`}>
                        {p.charLimit}자
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 톤 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">답변 톤</h2>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`rounded-2xl py-2.5 px-4 flex items-center gap-2 text-sm font-semibold transition ${
                        tone === t.id ? "bg-orange-500 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 리뷰 입력 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">리뷰 입력</h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">매장명 (선택)</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="예) 카페 베이글"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">고객 리뷰</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="고객 리뷰를 여기에 붙여넣으세요..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition resize-none"
                  />
                </div>

                {/* 예시 리뷰 */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">예시 리뷰로 테스트</p>
                  <div className="flex flex-wrap gap-2">
                    {RATING_SCENARIOS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setReview(s.review)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generate}
                  disabled={loading || !review.trim()}
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      작성 중...
                    </>
                  ) : "💬 답변 생성"}
                </button>
              </div>
            </div>

            {/* 결과 */}
            <div>
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden h-full min-h-[500px] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">답변 초안</h2>
                  {result && (
                    <span className={`text-xs font-semibold ${overLimit ? "text-red-500" : "text-slate-400"}`}>
                      {charCount} / {currentPlatform.charLimit}자
                    </span>
                  )}
                </div>

                <div className="flex-1 p-6">
                  {!result && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-5xl mb-4">💬</div>
                      <p className="text-slate-400 text-sm">리뷰를 입력하고<br />답변 생성 버튼을 눌러주세요</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-slate-400">답변 작성 중...</p>
                    </div>
                  )}
                  {!loading && result && (
                    <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                      {result}
                    </div>
                  )}
                </div>

                {overLimit && (
                  <div className="px-6 pb-2">
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                      ⚠️ {currentPlatform.charLimit}자 제한을 초과했습니다. 다시 생성하거나 직접 수정해주세요.
                    </p>
                  </div>
                )}

                {result && (
                  <div className="px-6 pb-6 flex gap-2">
                    <button onClick={generate} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                      🔄 다시 생성
                    </button>
                    <button onClick={copy} className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition">
                      {copied ? "✓ 복사됨" : "📋 복사하기"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 부정적인 리뷰일수록 빠른 답변이 중요합니다. AI 초안을 기반으로 실제 상황에 맞게 수정한 뒤 게시하세요. 리뷰어의 이름을 언급하면 더 개인적인 느낌을 줄 수 있습니다.
          </div>
        </div>
      </main>
      </PlanGate>
    </>
  );
}
