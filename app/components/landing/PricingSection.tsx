import Link from "next/link";
import { FadeIn } from "./LandingUtils";

const PLANS = [
  { plan: "무료", price: "0", unit: "원/월", desc: "일단 써보고 싶은 사장님", features: ["수익 시뮬레이터", "메뉴 원가 계산기", "인건비 계산기", "월 3회 AI 기능"], btn: "무료로 시작", cls: "pricing-btn-gray", href: "/signup", popular: false },
  { plan: "프로", price: "29,900", unit: "원/월", desc: "제대로 관리하고 싶은 사장님", features: ["무료 기능 전부 포함", "AI 기능 무제한", "리뷰 답변 · SNS 콘텐츠", "세금 계산 · 손익 리포트", "데이터 클라우드 저장"], btn: "프로 시작하기", cls: "pricing-btn-blue", href: "/pricing", popular: true },
];

export function PricingSection() {
  return (
    <section id="pricing" className="features-bg">
      <div className="section-inner">
        <FadeIn>
          <span className="section-tag">요금제</span>
          <h2 className="section-title">부담 없이 시작하세요</h2>
          <p className="section-desc">기본 도구는 무료. 더 필요하면 그때 업그레이드하세요.</p>
        </FadeIn>
        <div className="pricing-grid">
          {PLANS.map((p) => (
            <FadeIn key={p.plan}>
              <div className={`pricing-card${p.popular ? " popular" : ""}`}>
                {p.popular && <div className="pricing-popular-badge">추천</div>}
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
