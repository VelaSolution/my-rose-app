import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero" id="home">
      <div className="hero-bg" /><div className="hero-bg2" />
      <div className="hero-inner">
        <div>
          <div className="fade-init d1">
            <div className="hero-tag"><span className="hero-tag-dot" />외식업 경영 분석 플랫폼</div>
            <h1 className="hero-title">외식업 사장님을 위한<br /><span>숫자 경영</span> 파트너</h1>
            <p className="hero-desc">매출·원가·인건비·대출을 한 번에 시뮬레이션하고<br />AI 컨설턴트의 맞춤 전략을 받아보세요.</p>
            <div className="hero-actions">
              <Link href="/signup" className="btn-primary">무료로 시작하기 →</Link>
              <a href="#features" className="btn-secondary">서비스 알아보기</a>
            </div>
            <div className="hero-stats">
              <div><div className="stat-num">4<span>개</span></div><div className="stat-label">업종 지원</div></div>
              <div><div className="stat-num">20<span>+</span></div><div className="stat-label">재무 지표</div></div>
              <div><div className="stat-num">AI</div><div className="stat-label">실시간 전략</div></div>
            </div>
          </div>
        </div>
        <div className="fade-init d2">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-card-title">☕ 카페 · 운영 중</span>
              <span className="hero-card-badge">흑자</span>
            </div>
            <div className="hero-metric-label">이번 달 세전 순이익</div>
            <div className={`hero-metric-value green`}>+3,420,000원</div>
            <div className="hero-bar-wrap"><div className="hero-bar" /></div>
            <div className="hero-row"><span className="hero-row-label">월 총 매출</span><span className="hero-row-value">28,500,000원</span></div>
            <div className="hero-row"><span className="hero-row-label">손익분기점</span><span className="hero-row-value">22,100,000원 ✓</span></div>
            <div className="hero-row"><span className="hero-row-label">투자금 회수</span><span className="hero-row-value">18개월 예상</span></div>
            <div className="hero-row"><span className="hero-row-label">순이익률</span><span className="hero-row-value" style={{ color: "#3182F6" }}>12.0%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
