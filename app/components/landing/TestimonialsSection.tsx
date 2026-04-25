import { FadeIn } from "./LandingUtils";

const USE_CASES = [
  { icon: "☕", title: "카페 사장님", desc: "아메리카노 한 잔에 얼마 남는지, 알바비 빼면 내 월급이 얼마인지 바로 계산합니다." },
  { icon: "🍽️", title: "음식점 사장님", desc: "재료비 오를 때 메뉴 가격을 얼마나 올려야 하는지, 배달 수수료 포함 실수익을 봅니다." },
  { icon: "🥩", title: "고깃집 사장님", desc: "고기 원가율이 높아도 술 마진으로 커버 가능한지, 테이블당 순익을 확인합니다." },
  { icon: "🍺", title: "술집/바 사장님", desc: "주류 마진율과 안주 원가를 따로 계산해서, 실제 수익 구조를 한눈에 파악합니다." },
  { icon: "🍷", title: "파인다이닝 사장님", desc: "높은 객단가와 코스 구성에 맞춘 원가율·인건비 분석으로 수익성을 점검합니다." },
];

export function TestimonialsSection() {
  return (
    <section className="testi-bg">
      <div className="section-inner">
        <FadeIn>
          <span className="section-tag" style={{ background: "rgba(255,255,255,.06)", color: "#93C5FD", border: "1px solid rgba(255,255,255,0.1)" }}>이런 분들이 씁니다</span>
          <h2 className="section-title">내 업종에 딱 맞는 계산</h2>
        </FadeIn>
        <div className="testi-grid">
          {USE_CASES.map((t, i) => (
            <FadeIn key={t.title} delay={i * 80}>
              <div className="testi-card">
                <div style={{ fontSize: 36, marginBottom: 12 }}>{t.icon}</div>
                <div className="testi-name" style={{ marginBottom: 8 }}>{t.title}</div>
                <div className="testi-text" style={{ fontSize: 14 }}>{t.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
