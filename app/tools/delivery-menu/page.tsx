"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";
import PlanGate from "@/components/PlanGate";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Platform = "baemin" | "coupang" | "yogiyo";
type Tag = "spicy" | "popular" | "recommended" | "new" | "signature" | "healthy";

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: "baemin", label: "배달의민족", icon: "🟡" },
  { id: "coupang", label: "쿠팡이츠", icon: "🟢" },
  { id: "yogiyo", label: "요기요", icon: "🔴" },
];

const TAGS: { id: Tag; label: string }[] = [
  { id: "spicy", label: "매운맛" },
  { id: "popular", label: "인기" },
  { id: "recommended", label: "추천" },
  { id: "new", label: "신메뉴" },
  { id: "signature", label: "시그니처" },
  { id: "healthy", label: "건강식" },
];

const TAG_LABELS: Record<Tag, string> = {
  spicy: "매운맛",
  popular: "인기 메뉴",
  recommended: "사장님 추천",
  new: "신메뉴",
  signature: "시그니처",
  healthy: "건강/다이어트",
};

const PLATFORM_TIPS: Record<Platform, string> = {
  baemin: "배달의민족은 한 줄 설명이 리스트에 직접 노출됩니다. 30자 이내로 핵심을 전달하세요.",
  coupang: "쿠팡이츠는 사진 옆에 설명이 표시됩니다. 재료와 양을 구체적으로 적으면 효과적입니다.",
  yogiyo: "요기요는 메뉴 상세에서 설명이 보입니다. 맛의 특징과 추천 조합을 강조하세요.",
};

export default function DeliveryMenuPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => setIsLoggedIn(!!data.user));
  }, []);

  const [platform, setPlatform] = useState<Platform>("baemin");
  const [menuName, setMenuName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ oneLiner: string; detail: string }[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  async function generate() {
    if (!menuName.trim()) return;
    if (!isLoggedIn) {
      window.location.href = "/login?next=/tools/delivery-menu";
      return;
    }
    setLoading(true);
    setResults([]);

    const tagStr = selectedTags.map((t) => TAG_LABELS[t]).join(", ") || "없음";

    const prompt = `당신은 배달앱 메뉴 최적화 전문 카피라이터입니다.
아래 메뉴 정보를 바탕으로 ${PLATFORMS.find((p) => p.id === platform)!.label}에 최적화된 메뉴 설명을 작성하세요.

[메뉴 정보]
메뉴명: ${menuName}
주요 재료: ${ingredients || "(미입력)"}
가격: ${price ? price + "원" : "(미입력)"}
특징 태그: ${tagStr}
플랫폼: ${PLATFORMS.find((p) => p.id === platform)!.label}

[작성 규칙]
- "한줄설명"은 30자 이내로 클릭을 유도하는 매력적인 한 줄
- "상세설명"은 100자 이내로 재료, 맛, 양, 추천 포인트를 포함
- 3가지 버전을 작성하세요 (A/B 테스트용)
- 과장 금지, 실제 재료/특징 기반으로 작성
- 이모지는 적절히 1~2개만 사용

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
[
  { "oneLiner": "한줄설명", "detail": "상세설명" },
  { "oneLiner": "한줄설명", "detail": "상세설명" },
  { "oneLiner": "한줄설명", "detail": "상세설명" }
]`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt:
            "당신은 배달앱 메뉴 설명 최적화 전문가입니다. 클릭률을 높이는 매력적인 메뉴 설명을 작성합니다. 반드시 요청한 JSON 형식으로만 응답하세요.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);

      const text = (data.text ?? "").trim();
      // JSON 파싱 시도
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { oneLiner: string; detail: string }[];
        setResults(parsed);
      } else {
        throw new Error("AI 응답을 파싱할 수 없습니다.");
      }
    } catch (e) {
      setResults([
        {
          oneLiner: "오류 발생",
          detail: `메뉴 설명 생성 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "다시 시도해주세요."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const copyText = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      <NavBar />
      <ToolNav />
      <PlanGate>
        <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3 mb-8 mt-4">
              <Link
                href="/tools"
                className="text-sm text-slate-400 hover:text-slate-700 transition"
              >
                ← 도구 목록
              </Link>
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                <span>🛵</span> AI 메뉴 최적화
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                배달앱 메뉴 설명 최적화
              </h1>
              <p className="text-slate-500 text-sm">
                메뉴 정보를 입력하면 AI가 배달앱별 최적화된 메뉴 설명을 생성합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 입력 */}
              <div className="space-y-5">
                {/* 플랫폼 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3">배달 플랫폼</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`rounded-2xl py-3 text-center transition ${
                          platform === p.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xl mb-1">{p.icon}</div>
                        <div className="text-xs font-semibold">{p.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{PLATFORM_TIPS[platform]}</p>
                </div>

                {/* 특징 태그 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3">메뉴 특징</h2>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                          selectedTags.includes(t.id)
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 상세 입력 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                  <h2 className="font-bold text-slate-900">메뉴 정보</h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      메뉴명 *
                    </label>
                    <input
                      type="text"
                      value={menuName}
                      onChange={(e) => setMenuName(e.target.value)}
                      placeholder="예) 매콤 치즈 불닭볶음면"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      주요 재료
                    </label>
                    <input
                      type="text"
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="예) 국내산 닭가슴살, 모짜렐라 치즈, 청양고추"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      가격
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="예) 12,900"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white transition"
                    />
                  </div>

                  {isLoggedIn === false && (
                    <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
                      <span className="text-blue-500 text-lg">🔒</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700">
                          AI 생성은 로그인이 필요해요
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">
                          무료로 가입하면 바로 사용 가능
                        </p>
                      </div>
                      <Link
                        href="/login?next=/tools/delivery-menu"
                        className="flex-shrink-0 rounded-xl bg-blue-500 text-white text-xs font-bold px-3 py-2 hover:bg-blue-600 transition"
                      >
                        로그인 →
                      </Link>
                    </div>
                  )}

                  <button
                    onClick={generate}
                    disabled={loading || !menuName.trim()}
                    className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="white"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="white"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        생성 중...
                      </>
                    ) : isLoggedIn === false ? (
                      "🔒 로그인 후 생성하기"
                    ) : (
                      "🛵 메뉴 설명 생성"
                    )}
                  </button>
                </div>
              </div>

              {/* 결과 */}
              <div>
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden h-full min-h-[500px] flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">생성 결과</h2>
                  </div>

                  <div className="flex-1 p-6">
                    {results.length === 0 && !loading && (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="text-5xl mb-4">🛵</div>
                        <p className="text-slate-400 text-sm">
                          메뉴 정보를 입력하고
                          <br />
                          생성 버튼을 눌러주세요
                        </p>
                      </div>
                    )}
                    {loading && (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <svg
                          className="animate-spin w-8 h-8 text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <p className="text-sm text-slate-400">메뉴 설명 생성 중...</p>
                      </div>
                    )}
                    {!loading && results.length > 0 && (
                      <div className="space-y-4">
                        {results.map((r, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-400">
                                버전 {String.fromCharCode(65 + i)}
                              </span>
                              <button
                                onClick={() =>
                                  copyText(i, `${r.oneLiner}\n${r.detail}`)
                                }
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                              >
                                {copiedIdx === i ? (
                                  <span className="text-emerald-500">✓ 복사됨</span>
                                ) : (
                                  "📋 복사"
                                )}
                              </button>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mb-1">
                              {r.oneLiner}
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {r.detail}
                            </p>
                            <div className="mt-2 text-xs text-slate-400">
                              한줄: {r.oneLiner.length}자 / 상세: {r.detail.length}자
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {results.length > 0 && (
                    <div className="px-6 pb-6">
                      <button
                        onClick={generate}
                        className="w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                      >
                        🔄 다시 생성
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="mt-8 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">
                💡 배달앱에서 클릭률 높은 메뉴 설명의 특징
              </h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      구체적인 재료명을 언급하세요
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      &quot;특제 소스&quot;보다 &quot;국내산 고추장 + 꿀 블렌딩 소스&quot;가 클릭률 2배 높음
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      양과 크기를 수치로 표현하세요
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      &quot;푸짐한 양&quot;보다 &quot;300g 두툼한 수제 패티&quot;가 신뢰감 형성
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      감각적 표현으로 맛을 상상하게 하세요
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      &quot;바삭한 튀김&quot; &quot;쫄깃한 면발&quot; &quot;진한 육수&quot; 같은 오감 자극 표현
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      한 줄 설명은 30자 이내로 핵심만
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      배달앱 리스트에서 잘리지 않는 30자가 최적. 가장 매력적인 포인트 하나만 강조
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      인기/추천 뱃지 키워드를 활용하세요
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      &quot;주문율 1위&quot; &quot;리뷰 300+&quot; &quot;사장님 추천&quot; 등 사회적 증거가 전환율을 높임
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
              💡 <strong className="text-slate-700">Tip.</strong> 같은 메뉴라도
              플랫폼별로 설명을 다르게 작성하면 더 높은 클릭률을 얻을 수 있습니다.
              생성된 3가지 버전을 각각 다른 플랫폼에 적용해보세요.
            </div>
          </div>
        </main>
      </PlanGate>
    </>
  );
}
