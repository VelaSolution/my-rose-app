"use client";

import { useState } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";

type ReviewResult = {
  overall: "positive" | "neutral" | "negative";
  score: number;
  keywords: { word: string; sentiment: "positive" | "negative" }[];
  strengths: string[];
  improvements: string[];
  summary: string;
};

export default function ReviewAnalysisPage() {
  const [reviews, setReviews] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!reviews.trim()) { setError("리뷰를 입력해주세요."); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 고객 리뷰 분석 전문가입니다. 반드시 JSON 형식으로만 응답하세요.",
          prompt: `아래 고객 리뷰들을 분석해주세요.

[리뷰]
${reviews.slice(0, 3000)}

JSON 형식:
{
  "overall": "positive" | "neutral" | "negative",
  "score": 1~10 (고객 만족도),
  "keywords": [{"word":"키워드","sentiment":"positive|negative"}] (최대 8개),
  "strengths": ["강점1","강점2","강점3"] (최대 3개),
  "improvements": ["개선점1","개선점2","개선점3"] (최대 3개),
  "summary": "전체 리뷰 분석 요약 3~4문장. 사장님이 바로 실행할 수 있는 인사이트 위주로."
}`,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(JSON.parse(data.text.replace(/```json|```/g, "").trim()));
    } catch {
      setError("분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = { positive: "text-emerald-600", neutral: "text-slate-600", negative: "text-red-500" };
  const sentimentLabel = { positive: "긍정적", neutral: "보통", negative: "부정적" };
  const sentimentBg = { positive: "bg-emerald-50", neutral: "bg-slate-50", negative: "bg-red-50" };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-2xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>💬</span> 리뷰 분석
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">고객 리뷰 감정 분석</h1>
          <p className="text-slate-500 text-sm">네이버/배민/구글 리뷰를 붙여넣으면 AI가 키워드·감정·개선점을 분석합니다.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 mb-6">
          <textarea
            value={reviews}
            onChange={(e) => setReviews(e.target.value)}
            placeholder={"리뷰를 붙여넣으세요. 여러 개를 한번에 넣어도 됩니다.\n\n예:\n맛있었어요! 분위기도 좋고 직원분이 친절했어요.\n---\n음식은 괜찮은데 대기가 너무 길었어요. 주차도 불편합니다."}
            rows={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2 text-right">{reviews.length}/3000자</p>

          <button onClick={analyze} disabled={loading || !reviews.trim()} className="mt-3 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition">
            {loading ? "AI 분석 중..." : "리뷰 분석하기"}
          </button>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 mb-6">{error}</div>}

        {result && (
          <div className="space-y-4">
            {/* 종합 점수 */}
            <div className={`rounded-3xl p-6 ring-1 ring-slate-200 text-center ${sentimentBg[result.overall]}`}>
              <p className="text-sm text-slate-500 mb-1">고객 만족도</p>
              <p className={`text-5xl font-extrabold ${sentimentColor[result.overall]}`}>{result.score}<span className="text-lg text-slate-400">/10</span></p>
              <p className={`text-sm font-semibold mt-2 ${sentimentColor[result.overall]}`}>{sentimentLabel[result.overall]}</p>
            </div>

            {/* 키워드 */}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">핵심 키워드</h3>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((k) => (
                  <span key={k.word} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${k.sentiment === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {k.sentiment === "positive" ? "👍" : "👎"} {k.word}
                  </span>
                ))}
              </div>
            </div>

            {/* 강점 / 개선점 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
                <h3 className="text-sm font-bold text-emerald-800 mb-3">강점</h3>
                <div className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm text-emerald-700"><span>✓</span>{s}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
                <h3 className="text-sm font-bold text-amber-800 mb-3">개선점</h3>
                <div className="space-y-2">
                  {result.improvements.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm text-amber-700"><span>!</span>{s}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI 요약 */}
            <div className="rounded-3xl bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-2">AI 분석 요약</h3>
              <p className="text-sm leading-7 text-slate-300">{result.summary}</p>
            </div>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
