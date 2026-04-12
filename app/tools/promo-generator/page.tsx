"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import PlanGate from "@/components/PlanGate";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import CollapsibleTip from "@/components/CollapsibleTip";

type EventType = "new-menu" | "discount" | "season" | "anniversary" | "grand-open";
type Channel = "flyer" | "banner" | "delivery-notice" | "kakao" | "sms";

const EVENT_TYPES: { id: EventType; label: string; icon: string }[] = [
  { id: "new-menu", label: "신메뉴 출시", icon: "🆕" },
  { id: "discount", label: "할인 이벤트", icon: "💸" },
  { id: "season", label: "시즌 메뉴", icon: "🍂" },
  { id: "anniversary", label: "기념일", icon: "🎉" },
  { id: "grand-open", label: "오픈 기념", icon: "🎊" },
];

const CHANNELS: { id: Channel; label: string; icon: string; desc: string }[] = [
  { id: "flyer", label: "전단지", icon: "📄", desc: "짧고 임팩트, 헤드라인 중심" },
  { id: "banner", label: "현수막", icon: "🪧", desc: "15자 이내 한 줄 강조" },
  { id: "delivery-notice", label: "배달앱 공지", icon: "🛵", desc: "공지 탭에 노출, 200자 이내" },
  { id: "kakao", label: "카카오채널", icon: "💛", desc: "친구톡/알림톡 형식" },
  { id: "sms", label: "문자 메시지", icon: "💬", desc: "90바이트(한글 45자) 이내" },
];

const EVENT_LABELS: Record<EventType, string> = {
  "new-menu": "신메뉴 출시",
  discount: "할인 이벤트",
  season: "시즌 메뉴",
  anniversary: "기념일 이벤트",
  "grand-open": "오픈 기념 이벤트",
};

const CHANNEL_GUIDES: Record<Channel, string> = {
  flyer: "전단지: 헤드카피 + 서브카피 + CTA(행동 유도 문구). 한눈에 들어오게. 핵심 혜택을 가장 크게.",
  banner: "현수막: 15자 이내 헤드라인 1줄 + 서브 1줄. 차량/보행자가 3초 내 인식 가능하게.",
  "delivery-notice": "배달앱 공지: 200자 이내. 이벤트 기간·혜택·조건을 명확하게. 줄바꿈 활용.",
  kakao: "카카오채널: 친근한 톤. 이모지 활용. 링크·쿠폰 연동 가능. 300자 이내.",
  sms: "문자 메시지: 한글 45자(90바이트) 이내. [광고] 표기 필수. 수신거부 번호 포함.",
};

export default function PromoGeneratorPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => setIsLoggedIn(!!data.user));
  }, []);

  const [eventType, setEventType] = useState<EventType>("new-menu");
  const [eventContent, setEventContent] = useState("");
  const [storeName, setStoreName] = useState("");
  const [industry, setIndustry] = useState("");
  const [channel, setChannel] = useState<Channel>("flyer");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function generate() {
    if (!eventContent.trim()) return;
    if (!isLoggedIn) {
      window.location.href = "/login?next=/tools/promo-generator";
      return;
    }
    setLoading(true);
    setResults([]);

    const channelInfo = CHANNELS.find((c) => c.id === channel)!;

    const prompt = `당신은 외식업 마케팅 카피라이터입니다.
아래 정보를 바탕으로 ${channelInfo.label}에 최적화된 프로모션 문구를 작성하세요.

[매장 정보]
매장명: ${storeName || "(미입력)"}
업종: ${industry || "(미입력)"}

[이벤트 정보]
이벤트 유형: ${EVENT_LABELS[eventType]}
이벤트 내용: ${eventContent}

[채널 가이드]
${CHANNEL_GUIDES[channel]}

[작성 규칙]
- 3가지 버전을 작성하세요 (A/B 테스트용)
- 각 버전은 채널 특성에 맞는 길이와 톤으로 작성
- 과장/허위 표현 금지
- 매장명이 있으면 자연스럽게 포함
- 문자 메시지의 경우 [광고] 표기와 수신거부 안내 포함
- 전단지/현수막은 헤드카피와 서브카피를 구분하여 작성

각 버전을 "---"로 구분하여 3개 작성하세요. 버전 번호나 설명 없이 문구만 작성.`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt:
            "당신은 외식업 전문 마케팅 카피라이터입니다. 채널별 특성에 맞는 프로모션 문구를 작성합니다. 각 버전을 ---로 구분하여 3개 작성하세요.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);

      const text = (data.text ?? "").trim();
      const variations = text
        .split(/---+/)
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);
      setResults(variations.length > 0 ? variations : [text]);
    } catch (e) {
      setResults([
        `프로모션 문구 생성 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "다시 시도해주세요."}`,
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
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                <span>📣</span> AI 프로모션
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                프로모션 문구 생성기
              </h1>
              <p className="text-slate-500 text-sm">
                이벤트 정보를 입력하면 채널별 맞춤 프로모션 문구를 AI가 생성합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 입력 */}
              <div className="space-y-5">
                {/* 이벤트 유형 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3">이벤트 유형</h2>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEventType(e.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition ${
                          eventType === e.id
                            ? "bg-violet-500 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <span>{e.icon}</span>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 채널 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3">홍보 채널</h2>
                  <div className="space-y-2">
                    {CHANNELS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setChannel(c.id)}
                        className={`w-full rounded-2xl py-3 px-4 flex items-center gap-3 text-left transition ${
                          channel === c.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-lg">{c.icon}</span>
                        <div>
                          <div className="text-sm font-bold">{c.label}</div>
                          <div
                            className={`text-xs mt-0.5 ${
                              channel === c.id ? "text-slate-400" : "text-slate-400"
                            }`}
                          >
                            {c.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 상세 입력 */}
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                  <h2 className="font-bold text-slate-900">이벤트 상세</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        매장명
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="예) 성수 브런치"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        업종
                      </label>
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="예) 브런치 카페"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:bg-white transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      이벤트 내용 *
                    </label>
                    <textarea
                      value={eventContent}
                      onChange={(e) => setEventContent(e.target.value)}
                      placeholder="예) 런치 세트 20% 할인, ~3월 말까지. 아메리카노+샌드위치 세트 8,900원"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:bg-white transition resize-none"
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
                        href="/login?next=/tools/promo-generator"
                        className="flex-shrink-0 rounded-xl bg-blue-500 text-white text-xs font-bold px-3 py-2 hover:bg-blue-600 transition"
                      >
                        로그인 →
                      </Link>
                    </div>
                  )}

                  <button
                    onClick={generate}
                    disabled={loading || !eventContent.trim()}
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
                      "📣 프로모션 문구 생성"
                    )}
                  </button>
                </div>
              </div>

              {/* 결과 */}
              <div>
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden h-full min-h-[500px] flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">생성 결과 (3가지 버전)</h2>
                  </div>

                  <div className="flex-1 p-6">
                    {results.length === 0 && !loading && (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="text-5xl mb-4">📣</div>
                        <p className="text-slate-400 text-sm">
                          이벤트 정보를 입력하고
                          <br />
                          생성 버튼을 눌러주세요
                        </p>
                        <p className="text-slate-300 text-xs mt-2">
                          3가지 버전이 생성되어 A/B 테스트에 활용할 수 있습니다
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
                        <p className="text-sm text-slate-400">프로모션 문구 생성 중...</p>
                      </div>
                    )}
                    {!loading && results.length > 0 && (
                      <div className="space-y-4">
                        {results.map((text, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">
                                버전 {String.fromCharCode(65 + i)}
                              </span>
                              <button
                                onClick={() => copyText(i, text)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                              >
                                {copiedIdx === i ? (
                                  <span className="text-emerald-500">✓ 복사됨</span>
                                ) : (
                                  "📋 복사"
                                )}
                              </button>
                            </div>
                            <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                              {text}
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

            <CollapsibleTip className="mt-6">
              같은 이벤트라도
              채널마다 문구 스타일이 달라야 효과적입니다. 전단지는 한눈에 들어오는
              헤드라인, 문자는 45자 이내 핵심, 카카오채널은 친근한 톤이 핵심입니다.
            </CollapsibleTip>
          </div>
        </main>
      </PlanGate>
    </>
  );
}
