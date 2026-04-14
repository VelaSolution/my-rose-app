"use client";

import { useMemo, useState } from "react";
import {
  INDUSTRY_CONFIG, calcResult, fmt,
  type FullForm,
} from "@/lib/vela";

type GuideItem = { title: string; items: { action: string; detail: string }[] };

function buildGuides(form: FullForm, result: ReturnType<typeof calcResult>): GuideItem[] {
  const _config = INDUSTRY_CONFIG[form.industry];
  void _config;
  return [
    {
      title: "객단가를 높이는 방법",
      items: [
        { action: "세트 메뉴 구성", detail: "단품보다 10~15% 비싼 세트를 만들어 자연스럽게 추가 주문을 유도하세요. 음료+메인 조합이 가장 효과적입니다." },
        { action: "프리미엄 옵션 추가", detail: "기존 메뉴에 +2,000~5,000원짜리 업그레이드 옵션(특제 소스, 사이즈업, 토핑 추가)을 붙이세요." },
        { action: "테이블 추가 주문 유도", detail: "주문 시 '오늘의 추천', '인기 사이드' 등을 직원이 적극적으로 언급하면 객단가가 평균 8~12% 상승합니다." },
        { action: "계절 한정 메뉴 운영", detail: "희소성이 있는 시즌 메뉴는 일반 메뉴보다 20~30% 높은 가격을 책정해도 저항이 낮습니다." },
        { action: "디저트·음료 패키지", detail: `현재 객단가 ${fmt(form.avgSpend)}원 기준, 디저트 1개만 추가해도 ${fmt(Math.round(form.avgSpend * 0.15))}원 이상 객단가 상승 효과가 있습니다.` },
      ],
    },
    {
      title: "회전율을 높이는 방법",
      items: [
        { action: "주문·서빙 동선 개선", detail: "주문 → 조리 → 서빙 흐름을 분석해 병목 구간을 찾으세요. 보통 조리 대기가 가장 큰 병목입니다." },
        { action: "메뉴 수 줄이기", detail: "메뉴가 많을수록 선택 시간이 길어집니다. 핵심 메뉴 10~15개로 압축하면 주문 속도가 빨라지고 원가 관리도 쉬워집니다." },
        { action: "피크타임 예약제 도입", detail: "예약 고객은 대기 없이 바로 착석해 회전이 빠릅니다. 특히 주말 저녁 피크타임에 효과적입니다." },
        { action: "테이블 배치 재검토", detail: `현재 ${form.seats}석 기준, 4인 테이블을 2인 테이블 2개로 분리하면 소규모 손님 수용력이 높아져 실질 회전율이 올라갑니다.` },
        { action: "빠른 결제 시스템", detail: "QR 결제·테이블 오더 시스템 도입 시 테이블당 마감 시간이 평균 5~8분 단축됩니다." },
      ],
    },
    {
      title: "원가율을 낮추는 방법",
      items: [
        { action: "발주량 최적화", detail: "식재료 폐기율을 주 단위로 기록하세요. 폐기율 5% 감소만으로 원가율이 1~2%p 개선됩니다." },
        { action: "공동구매·단체 계약", detail: "인근 같은 업종 식당들과 식자재 공동구매를 하면 단가를 10~20% 낮출 수 있습니다." },
        { action: "메뉴 엔지니어링", detail: `원가율 ${form.cogsRate}% 기준, 원가율 높은 메뉴의 판매 비중을 줄이고 원가율 낮은 메뉴를 전면에 배치하세요.` },
        { action: "제철 식재료 활용", detail: "제철 재료는 품질이 좋고 가격이 저렴합니다. 계절 메뉴로 구성하면 원가와 신선도를 동시에 잡을 수 있습니다." },
        ...(form.industry !== "cafe" ? [{ action: "주류 구성 최적화", detail: `현재 주류 원가율 ${form.alcoholCogsRate}%. 하우스 와인·생맥주 등 원가율 낮은 주류 비중을 높이면 통합 원가율을 낮출 수 있습니다.` }] : []),
      ],
    },
    {
      title: "인건비를 효율화하는 방법",
      items: [
        { action: "시간대별 탄력 스케줄", detail: `평일 ${form.weekdayDays}일·주말 ${form.weekendDays}일 패턴에서 피크 시간대에만 풀 인원 배치하고, 한가한 시간대는 최소 인원으로 운영하세요.` },
        { action: "파트타임 비중 조정", detail: "정규직보다 파트타임 비중을 높이면 유연성이 올라갑니다. 단, 숙련도 관리가 핵심입니다." },
        { action: "다기능 직원 육성", detail: "홀·카운터·간단한 조리를 모두 할 수 있는 직원을 육성하면 인원 효율이 20~30% 올라갑니다." },
        { action: "키오스크·테이블 오더 도입", detail: "주문·결제를 자동화하면 카운터 인력 1명 분량을 줄일 수 있습니다. 초기 투자비 회수는 보통 6~12개월입니다." },
        { action: "비수기 영업시간 조정", detail: "매출이 낮은 시간대 영업을 단축하면 인건비와 공과금을 동시에 절감할 수 있습니다." },
      ],
    },
    {
      title: "배달 매출을 늘리는 방법",
      items: [
        { action: "배달 전용 메뉴 구성", detail: "배달에 최적화된(식어도 맛있는) 메뉴를 별도로 구성하세요. 홀 메뉴와 차별화하면 배달 전용 고객층을 잡을 수 있습니다." },
        { action: "리뷰 관리 집중", detail: "배달앱에서 별점 4.8 이상 유지가 핵심입니다. 주문 후 리뷰 요청 메시지 발송이 효과적입니다." },
        { action: "점심 특가 운영", detail: "배달 경쟁이 약한 오전 11~12시 구간에 점심 특가를 운영하면 주문 수를 늘릴 수 있습니다." },
        { action: "배달앱 수수료 구조 비교", detail: "배달의민족·쿠팡이츠·요기요 수수료 구조가 다릅니다. 주문 패턴에 맞는 플랫폼 조합을 찾으세요." },
        ...(form.deliveryEnabled ? [] : [{ action: "배달 채널 시작 검토", detail: `현재 홀 매출만으로 운영 중입니다. 배달 추가 시 월 ${fmt(Math.round(result.totalSales * 0.2))}원 이상의 추가 매출이 가능합니다.` }]),
      ],
    },
    {
      title: "마케팅·고객 유치 전략",
      items: [
        { action: "SNS 콘텐츠 정기 발행", detail: "인스타그램·네이버 플레이스에 주 2~3회 음식 사진을 올리세요. 플레이스 노출이 곧 신규 고객 유입입니다." },
        { action: "단골 고객 관리 프로그램", detail: "스탬프 카드·회원 적립 시스템 도입 시 재방문율이 평균 25% 상승합니다. 단골 1명이 신규 고객 3명보다 수익성이 높습니다." },
        { action: "점심 세트 할인으로 유입", detail: "처음 오는 고객을 점심 특가로 유입시키고, 저녁 정가 방문으로 전환하는 전략이 효과적입니다." },
        { action: "근처 직장인 타깃", detail: `${form.weekdayDays}일 평일 영업 기준, 주변 오피스 건물에 점심 단체 예약 할인 전단을 배포하면 안정적인 점심 매출이 만들어집니다.` },
        { action: "구글 맵 등록 & 관리", detail: "구글 맵 리뷰 관리는 외국인 관광객과 젊은 층 유입에 효과적입니다. 등록 후 사진과 메뉴 정보를 최신화하세요." },
      ],
    },
    {
      title: "손익분기점 빠르게 달성하는 방법",
      items: [
        { action: "BEP까지 비용 긴축", detail: `현재 BEP ${fmt(result.bep)}원 대비 매출이 ${result.bepGap >= 0 ? `${fmt(result.bepGap)}원 초과` : `${fmt(Math.abs(result.bepGap))}원 부족`} 상태입니다. BEP 달성 전까지는 마케팅·소모품비를 최소화하세요.` },
        { action: "변동비 우선 절감", detail: "BEP 달성에는 고정비 절감보다 변동비(원가율, 카드 수수료) 절감이 더 빠른 효과를 냅니다." },
        { action: "단기 매출 부스터 이벤트", detail: "오픈 특가, 생일 할인, SNS 이벤트 등 단기 프로모션으로 초기 인지도를 빠르게 올리세요." },
        { action: "고정비 재협상", detail: "임대료·통신비 등 고정비는 계약 갱신 시 협상 여지가 있습니다. 장기 계약 조건으로 임대료 인하를 요청해보세요." },
        { action: "투자금 회수 우선순위 설정", detail: `총 초기 투자비 ${fmt(result.totalInitialCost)}원 중 보증금 ${fmt(form.deposit)}원은 퇴거 시 반환됩니다. 실질 회수 대상은 ${fmt(result.totalInitialCost - form.deposit)}원입니다.` },
      ],
    },
  ];
}

export default function StrategyGuideSection({
  form, result,
}: {
  form: FullForm;
  result: ReturnType<typeof calcResult>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const guides = useMemo(() => buildGuides(form, result), [form, result]);

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">전략 가이드</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          지표별 실행 전략을 펼쳐서 확인하세요. 현재 매장 수치에 맞춰 구체적으로 제안합니다.
        </p>
      </div>
      <div className="space-y-2">
        {guides.map((guide, index) => (
          <div key={guide.title} className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{guide.title}</span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-5 py-5">
                {guide.items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-200 text-xs font-bold text-white dark:text-slate-900">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.action}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
