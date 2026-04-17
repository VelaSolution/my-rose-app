import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero" id="home">
      {/* Animated orbs */}
      <div className="hero-bg-orb hero-orb-1" />
      <div className="hero-bg-orb hero-orb-2" />
      <div className="hero-bg-orb hero-orb-3" />

      <div className="hero-inner">
        <div>
          <div className="fade-init d1">
            <div className="hero-tag"><span className="hero-tag-dot" />외식업 경영 분석 플랫폼</div>
            <h1 className="hero-title">외식업 사장님을 위한<br /><span className="gradient-text">숫자 경영</span> 파트너</h1>
            <p className="hero-desc">매출·원가·인건비·대출을 한 번에 시뮬레이션하고<br />AI 컨설턴트의 맞춤 전략을 받아보세요.</p>
            <div className="hero-actions">
              <Link href="/signup" className="btn-primary">무료로 시작하기 →</Link>
              <a href="#features" className="btn-secondary">서비스 알아보기</a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="stat-num">5<span>개</span></div><div className="stat-label">업종 지원</div></div>
              <div className="hero-stat"><div className="stat-num">30<span>+</span></div><div className="stat-label">경영 도구</div></div>
              <div className="hero-stat"><div className="stat-num">AI</div><div className="stat-label">실시간 전략</div></div>
            </div>
          </div>
        </div>
        <div className="fade-init d2">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-card-title">☕ 카페 · 20석 · 운영 중</span>
              <span className="hero-card-badge">흑자</span>
            </div>
            <div className="hero-metric-label">세후 실수령</div>
            <div className="hero-metric-value green">+2,180,000원</div>
            <div className="hero-bar-wrap"><div className="hero-bar" /></div>
            <div className="hero-row"><span className="hero-row-label">월 매출</span><span className="hero-row-value">18,200,000원</span></div>
            <div className="hero-row"><span className="hero-row-label">원가율</span><span className="hero-row-value">32%</span></div>
            <div className="hero-row"><span className="hero-row-label">손익분기</span><span className="hero-row-value">14,800,000원 ✓</span></div>
            <div className="hero-row"><span className="hero-row-label">순이익률</span><span className="hero-row-value" style={{ background: "linear-gradient(135deg,#3182F6,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>12.0%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
