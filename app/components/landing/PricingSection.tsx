import Link from "next/link";
import { FadeIn } from "./LandingUtils";

const PLANS = [
  { plan: "무료", price: "0", unit: "원/월", desc: "혼자 운영하는 소규모 매장", features: ["수익 시뮬레이터", "월 3회 AI 브리핑", "기본 차트 및 분석", "링크 공유"], btn: "무료로 시작", cls: "pricing-btn-gray", href: "/signup", popular: false },
  { plan: "프로", price: "29,900", unit: "원/월", desc: "매출부터 전략까지, 제대로 관리하고 싶은 사장님", features: ["무료 플랜 모든 기능", "모든 도구 무제한", "AI 브리핑·전략 무제한", "POS 분석 · PDF · 대시보드", "우선 고객 지원"], btn: "프로 시작", cls: "pricing-btn-blue", href: "/pricing", popular: true },
];

export function PricingSection() {
  return (
    <section id="pricing" className="features-bg">
      <div className="section-inner">
        <FadeIn><span className="section-tag">요금제</span><h2 className="section-title">합리적인 가격으로</h2><p className="section-desc">매장 규모에 맞는 플랜을 선택하세요. 언제든 변경 가능합니다.</p></FadeIn>
        <div className="pricing-grid">
          {PLANS.map((p) => (
            <FadeIn key={p.plan}>
              <div className={`pricing-card${p.popular ? " popular" : ""}`}>
                {p.popular && <div className="pricing-popular-badge">가장 인기</div>}
                <div className="pricing-plan">{p.plan}</div>
                <div className="pricing-price">{p.price}<span>{p.unit}</span></div>
                <div className="pricing-desc">{p.desc}</div>
                <ul className="pricing-features">{p.features.map((f) => <li key={f}><span className="pricing-check">✓</span>{f}</li>)}</ul>
                <Link href={p.href} className={`pricing-btn ${p.cls}`}>{p.btn}</Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
