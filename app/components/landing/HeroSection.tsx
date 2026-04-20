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
            <div className="hero-tag"><span className="hero-tag-dot" />매장 수익 계산기</div>
            <h1 className="hero-title">이번 달,<br /><span className="gradient-text">내 손에 얼마</span> 남을까?</h1>
            <p className="hero-desc">좌석 수랑 객단가만 넣으면 끝.<br />월세·재료비·인건비 빼고 진짜 남는 돈을 바로 보여드려요.</p>
            <div className="hero-actions">
              <Link href="/simulator" className="btn-primary" onClick={() => { try { (window as any).gtag?.("event", "cta_click", { event_category: "landing", event_label: "hero_simulator" }); } catch {} }}>내 매장 계산해보기 →</Link>
              <a href="#how" className="btn-secondary" onClick={() => { try { (window as any).gtag?.("event", "cta_click", { event_category: "landing", event_label: "hero_how" }); } catch {} }}>어떻게 되는지 보기</a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="stat-num">30<span>초</span></div><div className="stat-label">입력 완료</div></div>
              <div className="hero-stat"><div className="stat-num">0<span>원</span></div><div className="stat-label">완전 무료</div></div>
              <div className="hero-stat"><div className="stat-num">5<span>개</span></div><div className="stat-label">업종 지원</div></div>
            </div>
          </div>
        </div>
        <div className="fade-init d2">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-card-title">☕ 카페 · 20석 · 운영 중</span>
              <span className="hero-card-badge">흑자</span>
            </div>
            <div className="hero-metric-label">월세·재료비·인건비 다 빼고</div>
            <div className="hero-metric-value green">+2,180,000원</div>
            <div className="hero-bar-wrap"><div className="hero-bar" /></div>
            <div className="hero-row"><span className="hero-row-label">월 매출</span><span className="hero-row-value">18,200,000원</span></div>
            <div className="hero-row"><span className="hero-row-label">재료비</span><span className="hero-row-value">32%</span></div>
            <div className="hero-row"><span className="hero-row-label">최소 매출</span><span className="hero-row-value">14,800,000원 ✓</span></div>
            <div className="hero-row"><span className="hero-row-label">내 수익률</span><span className="hero-row-value" style={{ background: "linear-gradient(135deg,#3182F6,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>12.0%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
