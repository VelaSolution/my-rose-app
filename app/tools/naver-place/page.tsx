"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";

type CheckCategory = "basic" | "review" | "content" | "seo";

type CheckItem = {
  id: string;
  label: string;
  tip: string;
  category: CheckCategory;
};

const CATEGORIES: { id: CheckCategory; label: string; icon: string }[] = [
  { id: "basic", label: "기본 정보", icon: "📋" },
  { id: "review", label: "리뷰 관리", icon: "⭐" },
  { id: "content", label: "콘텐츠", icon: "📸" },
  { id: "seo", label: "SEO", icon: "🔍" },
];

const CHECKLIST: CheckItem[] = [
  // 기본 정보 (5)
  {
    id: "name-keyword",
    label: "매장명에 업종 키워드 포함",
    tip: "네이버 검색 시 매장명에 포함된 키워드가 노출 순위에 큰 영향을 줍니다. 예: \"성수 브런치 카페 베이글\" → '성수 브런치', '성수 카페', '성수 베이글' 모두 검색 노출 가능.",
    category: "basic",
  },
  {
    id: "hours",
    label: "영업시간 정확히 입력 (공휴일 포함)",
    tip: "영업시간이 부정확하면 방문 후 문닫은 매장을 경험한 고객이 부정 리뷰를 남깁니다. 특히 공휴일·명절 영업 여부는 반드시 업데이트하세요.",
    category: "basic",
  },
  {
    id: "photos-10",
    label: "메뉴 사진 10장 이상 등록",
    tip: "사진이 10장 이상인 매장은 미등록 매장 대비 클릭률이 2~3배 높습니다. 자연광에서 촬영한 음식 사진이 가장 효과적입니다.",
    category: "basic",
  },
  {
    id: "menu-price",
    label: "메뉴 가격 전체 등록",
    tip: "가격이 없으면 고객이 불안감을 느껴 이탈합니다. 모든 메뉴의 가격을 입력하면 '가격대' 필터 검색에도 노출됩니다.",
    category: "basic",
  },
  {
    id: "intro-200",
    label: "매장 소개글 200자 이상 작성",
    tip: "소개글에 지역명+업종 키워드를 자연스럽게 포함하면 검색 노출에 유리합니다. 매장 컨셉, 대표 메뉴, 분위기를 설명하세요.",
    category: "basic",
  },
  // 리뷰 관리 (4)
  {
    id: "review-24h",
    label: "모든 리뷰에 24시간 내 답변",
    tip: "리뷰 답변율이 높을수록 네이버 플레이스 알고리즘이 매장을 상위 노출시킵니다. 답변이 빠를수록 고객 재방문율도 높아집니다.",
    category: "review",
  },
  {
    id: "negative-reply",
    label: "부정 리뷰에 사과 + 개선 약속",
    tip: "부정 리뷰를 무시하면 잠재 고객이 이탈합니다. '죄송합니다 + 원인 설명 + 개선 약속' 3단 구조로 답변하면 오히려 신뢰를 얻을 수 있습니다.",
    category: "review",
  },
  {
    id: "receipt-review",
    label: "영수증 리뷰 이벤트 운영",
    tip: "영수증 리뷰는 실제 방문 인증이므로 신뢰도가 높습니다. '영수증 리뷰 작성 시 음료 1잔 서비스' 같은 이벤트가 효과적입니다.",
    category: "review",
  },
  {
    id: "blog-review",
    label: "블로그 체험단 월 1회 이상",
    tip: "블로그 리뷰는 네이버 검색에서 별도 탭으로 노출됩니다. 체험단을 통한 양질의 포스팅이 쌓이면 검색 상위 노출 확률이 크게 높아집니다.",
    category: "review",
  },
  // 콘텐츠 (3)
  {
    id: "news-weekly",
    label: "소식 탭에 주 1회 이상 업데이트",
    tip: "소식 탭 활동이 활발한 매장은 '활동적인 매장'으로 인식되어 검색 가중치를 받습니다. 신메뉴, 이벤트, 휴무일 공지 등을 정기적으로 올리세요.",
    category: "content",
  },
  {
    id: "seasonal-photo",
    label: "대표 사진 계절마다 교체",
    tip: "계절에 맞는 사진은 클릭률을 높입니다. 여름에 시원한 빙수, 겨울에 따뜻한 국물 사진으로 교체하면 시즌 검색 트렌드에 맞출 수 있습니다.",
    category: "content",
  },
  {
    id: "event-coupon",
    label: "이벤트/쿠폰 등록 활용",
    tip: "네이버 플레이스 쿠폰 기능을 활용하면 '쿠폰 있는 매장' 필터에 노출됩니다. 첫 방문 할인, 재방문 쿠폰이 효과적입니다.",
    category: "content",
  },
  // SEO (3)
  {
    id: "blog-posting",
    label: "블로그 포스팅 월 2회 (매장명 + 지역명 키워드)",
    tip: "네이버 블로그에 '매장명 + 지역명 + 업종' 키워드를 포함한 포스팅을 꾸준히 올리면 네이버 통합검색에서 매장이 더 자주 노출됩니다.",
    category: "seo",
  },
  {
    id: "instagram-location",
    label: "인스타그램 위치 태그 활용",
    tip: "인스타그램 위치 태그는 네이버·구글 검색에도 간접적으로 영향을 줍니다. 고객이 위치 태그를 사용하면 매장 인지도가 올라갑니다.",
    category: "seo",
  },
  {
    id: "google-business",
    label: "구글 비즈니스 프로필도 등록",
    tip: "외국인 고객과 구글맵 사용자를 위해 필수입니다. 네이버와 구글 양쪽에 등록하면 검색 커버리지가 2배로 늘어납니다.",
    category: "seo",
  },
];

const STORAGE_KEY = "vela-naver-place-checklist";

export default function NaverPlacePage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // localStorage에서 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setChecked(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // ignore
    }
  }, [checked]);

  const toggleCheck = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalItems = CHECKLIST.length;
  const doneItems = CHECKLIST.filter((item) => checked[item.id]).length;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  const getCategoryItems = (cat: CheckCategory) =>
    CHECKLIST.filter((item) => item.category === cat);

  const getCategoryProgress = (cat: CheckCategory) => {
    const items = getCategoryItems(cat);
    const done = items.filter((item) => checked[item.id]).length;
    return { done, total: items.length };
  };

  return (
    <>
      <NavBar />
      <ToolNav />
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

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🟢</span> 무료 가이드
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              네이버 플레이스 최적화 체크리스트
            </h1>
            <p className="text-slate-500 text-sm">
              15개 항목을 하나씩 실행하면 네이버 플레이스 검색 노출이 크게 개선됩니다.
            </p>
          </div>

          {/* 진행률 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">전체 진행률</h2>
              <span className="text-2xl font-extrabold text-slate-900">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 mb-4">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const { done, total } = getCategoryProgress(cat.id);
                return (
                  <div key={cat.id} className="text-center">
                    <div className="text-lg mb-1">{cat.icon}</div>
                    <p className="text-xs font-semibold text-slate-700">{cat.label}</p>
                    <p
                      className={`text-xs font-bold mt-0.5 ${
                        done === total ? "text-green-500" : "text-slate-400"
                      }`}
                    >
                      {done}/{total}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 체크리스트 */}
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const items = getCategoryItems(cat.id);
              const { done, total } = getCategoryProgress(cat.id);

              return (
                <div
                  key={cat.id}
                  className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <h2 className="font-bold text-slate-900">{cat.label}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all"
                          style={{
                            width: `${total > 0 ? (done / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        {done}/{total}
                      </span>
                      {done === total && (
                        <span className="text-xs font-bold text-green-500">완료 ✓</span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {items.map((item) => {
                      const isExpanded = expandedItem === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`transition ${checked[item.id] ? "bg-slate-50/50" : ""}`}
                        >
                          <div className="px-6 py-4 flex items-start gap-4">
                            <div className="mt-0.5 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={!!checked[item.id]}
                                onChange={() => toggleCheck(item.id)}
                                className="w-4 h-4 accent-green-500 cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() =>
                                  setExpandedItem(isExpanded ? null : item.id)
                                }
                                className="w-full text-left"
                              >
                                <span
                                  className={`text-sm font-semibold ${
                                    checked[item.id]
                                      ? "line-through text-slate-400"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                <span className="ml-2 text-xs text-slate-300">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="mt-2 rounded-2xl bg-green-50 border border-green-100 px-4 py-3">
                                  <p className="text-xs font-semibold text-green-700 mb-1">
                                    왜 중요한가요?
                                  </p>
                                  <p className="text-xs text-green-600 leading-relaxed">
                                    {item.tip}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-center">
            <p className="text-white font-bold text-lg mb-2">
              리뷰 답변, AI로 빠르게 작성하세요
            </p>
            <p className="text-slate-400 text-sm mb-4">
              체크리스트의 &quot;모든 리뷰에 24시간 내 답변&quot;을 실천하는 가장 빠른 방법
            </p>
            <Link
              href="/tools/review-reply"
              className="inline-block rounded-2xl bg-white text-slate-900 font-bold text-sm px-6 py-3 hover:bg-slate-100 transition"
            >
              VELA 리뷰 답변 생성기로 리뷰에 빠르게 답변하기 →
            </Link>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 체크 상태는
            브라우저에 자동 저장됩니다. 15개 항목을 모두 완료하면 네이버 플레이스
            검색 순위가 눈에 띄게 개선됩니다. 한 번에 다 하기 어렵다면 매주 2~3개씩
            실행해보세요.
          </div>
        </div>
      </main>
    </>
  );
}
