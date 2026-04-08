"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { getLocale, t, type Locale } from "@/lib/i18n";

const TOOLS = [
  // 경영 분석
  { icon:"🧮", label:"메뉴별 원가 계산기", desc:"원가율·건당 순익 자동 계산",       href:"/tools/menu-cost" },
  { icon:"👥", label:"인건비 스케줄러",     desc:"주간·월간 인건비 예측",             href:"/tools/labor" },
  { icon:"🧾", label:"세금 계산기",         desc:"부가세·소득세 예상액 산출",         href:"/tools/tax" },
  { icon:"📄", label:"손익계산서 PDF",      desc:"월별 P&L 리포트 PDF 출력",         href:"/tools/pl-report" },
  { icon:"📊", label:"경쟁 매장 비교",      desc:"업계 평균 대비 내 매장 분석",       href:"/benchmark" },
  // AI 도구
  { icon:"📱", label:"SNS 콘텐츠 생성기",  desc:"인스타 캡션 AI 자동 생성",         href:"/tools/sns-content" },
  { icon:"💬", label:"리뷰 답변 생성기",    desc:"AI 맞춤 답변 초안 작성",           href:"/tools/review-reply" },
  { icon:"🗺️", label:"상권 분석 도우미",   desc:"AI 상권 적합도 평가 리포트",       href:"/tools/area-analysis" },
  { icon:"🛵", label:"배달앱 메뉴 최적화",  desc:"배민·쿠팡이츠 메뉴 설명 AI 생성",  href:"/tools/delivery-menu" },
  { icon:"🎉", label:"프로모션 문구 생성기", desc:"전단지·SNS·문자 문구 AI 생성",    href:"/tools/promo-generator" },
  // 마케팅·운영
  { icon:"🔍", label:"네이버 플레이스 최적화", desc:"검색 노출 15가지 체크리스트",    href:"/tools/naver-place" },
  { icon:"📅", label:"시즌 마케팅 캘린더",  desc:"월별 이벤트 + 마케팅 전략",        href:"/tools/marketing-calendar" },
  { icon:"📋", label:"매장 일일 체크리스트", desc:"오픈·마감 체크 (날짜별 저장)",     href:"/checklist" },
  { icon:"🥬", label:"식재료 가격 트래커",  desc:"식재료 가격 기록·변동 추이",       href:"/ingredient-tracker" },
  { icon:"✅", label:"창업 체크리스트",     desc:"인허가·준비물 단계별 가이드",       href:"/tools/startup-checklist" },
  { icon:"🎮", label:"경영 시뮬레이션 게임", desc:"90일 가상 매장 운영 체험",        href:"/game" },
  // 창업 도우미 (i18n)
  { icon:"📝", label:"사업계획서 도우미",   desc:"단계별 작성 + 미리보기 + 복사",    href:"/tools/business-plan",  i18nKey:"businessPlan" },
  { icon:"🏛️", label:"정부 지원사업 매칭",  desc:"내 조건 맞는 지원금·대출 매칭",    href:"/tools/gov-support",    i18nKey:"govSupport" },
  { icon:"🏢", label:"법인 설립 가이드",    desc:"개인 vs 법인 비교 + 설립 절차",    href:"/tools/incorporation",  i18nKey:"incorporation" },
  { icon:"📈", label:"재무 시뮬레이션",     desc:"런웨이·BEP·현금흐름 12개월",       href:"/tools/financial-sim",   i18nKey:"financialSim" },
  { icon:"💎", label:"투자 유치 도구",      desc:"밸류에이션 + IR 덱 + 미팅 준비",   href:"/tools/fundraising",    i18nKey:"fundraising" },
  { icon:"🧾", label:"세무·회계 가이드",    desc:"세금 캘린더 + 계산기 + 절세 전략",  href:"/tools/tax-guide",      i18nKey:"taxGuide" },
  { icon:"👥", label:"인력 채용 도구",      desc:"급여 계산 + 계약서 + 채용공고",     href:"/tools/hiring",         i18nKey:"hiring" },
] as const;

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocaleState] = useState<Locale>("ko");
  useEffect(() => { setLocaleState(getLocale()); }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <nav className="vela-nav" role="navigation" aria-label="메인 내비게이션" style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #E5E8EB",display:"flex",alignItems:"center"}}>
        <div className="vela-nav-inner" style={{maxWidth:1152,margin:"0 auto",padding:"0 32px",width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Link href="/" className="vela-nav-logo" style={{fontSize:20,fontWeight:800,color:"#191F28",textDecoration:"none",letterSpacing:"-0.02em"}}>VELA<span style={{color:"#3182F6"}}>.</span></Link>

          <div className="vela-nav-links">
            <a href="/#features">{t("nav.service", locale)}</a>
            <div className="vela-dropdown">
              <Link href="/tools" className="vela-dropdown-btn" style={{ textDecoration:"none" }}>{t("nav.tools", locale)} <span className="vela-dropdown-arrow">▾</span></Link>
              <div className="vela-dropdown-menu">
                {TOOLS.map(item => {
                  const lbl = "i18nKey" in item ? t(`tool.${item.i18nKey}.title`, locale) : item.label;
                  const dsc = "i18nKey" in item ? t(`tool.${item.i18nKey}.desc`, locale) : item.desc;
                  return (
                    <Link key={item.href} href={item.href} className="vela-dropdown-item">
                      <span className="vela-dropdown-icon">{item.icon}</span>
                      <div>
                        <p className="vela-dropdown-label">{lbl}</p>
                        <p className="vela-dropdown-desc">{dsc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            <Link href="/community">{t("nav.community", locale)}</Link>
            <Link href="/guide">{t("nav.guide", locale)}</Link>
            <Link href="/pricing">{t("nav.pricing", locale)}</Link>
          </div>

          <div className="vela-nav-actions">
            {user ? (
              <>
                <Link href="/profile" className="vela-user-name">
                  {user.user_metadata?.nickname ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "내 계정"}
                </Link>
                <Link href="/dashboard" className="vela-btn-dashboard">{t("nav.dashboard", locale)}</Link>
                {["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"].includes(user.email ?? "") && (
                  <Link href="/hq" className="vela-btn-dashboard" style={{background:"#1a1a2e",color:"#fff"}}>🏛️ HQ</Link>
                )}
                <button className="vela-btn-logout" onClick={handleLogout}>{t("nav.logout", locale)}</button>
                <Link href="/simulator" className="vela-btn-start">{t("nav.simulator", locale)}</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="vela-btn-login">{t("nav.login", locale)}</Link>
                <Link href="/signup" className="vela-btn-start">{t("nav.signup", locale)}</Link>
              </>
            )}
          </div>

          <button className="vela-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열���"} aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      <div className={`vela-mobile-menu${menuOpen ? " open" : ""}`} role="menu" aria-hidden={!menuOpen}>
        <a href="/#features" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>서비스</a>
        <div style={{ borderBottom:"1px solid #F2F4F6", paddingBottom:"8px" }}>
          <p style={{ fontSize:"11px", fontWeight:700, color:"#9EA6B3", padding:"12px 0 6px", letterSpacing:"0.5px" }}>도구</p>
          {TOOLS.map(item => (
            <Link key={item.href} href={item.href} className="vela-mobile-link" onClick={() => setMenuOpen(false)} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span>{item.icon}</span>{"i18nKey" in item ? t(`tool.${item.i18nKey}.title`, locale) : item.label}
            </Link>
          ))}
        </div>
        <Link href="/community" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>커뮤니티</Link>
        <Link href="/guide" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>📖 가이드</Link>
        <Link href="/pricing" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>요금제</Link>
        {user ? (
          <>
            <Link href="/profile" className="vela-mobile-link" onClick={() => setMenuOpen(false)}
              style={{ fontSize:"16px", fontWeight:700, color:"#191F28", paddingTop:16, paddingBottom:8 }}>
              {user.user_metadata?.nickname ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "내 계정"}
            </Link>
            <Link href="/dashboard" className="vela-mobile-link" onClick={() => setMenuOpen(false)}
              style={{ fontSize:"13px", color:"#6B7684" }}>대시보드</Link>
            <Link href="/simulator" className="vela-mobile-link" onClick={() => setMenuOpen(false)}
              style={{ fontSize:"13px", color:"#6B7684" }}>시뮬레이터</Link>
            <button className="vela-mobile-link" style={{ background:"none", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"inherit", fontSize:"13px", fontWeight:"500", color:"#9EA6B3", padding:"12px 0" }} onClick={() => { handleLogout(); setMenuOpen(false); }}>로그아웃</button>
          </>
        ) : (
          <>
            <Link href="/login" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>로그인</Link>
            <Link href="/signup" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>무료로 시작하기</Link>
          </>
        )}
        <div style={{borderTop:"1px solid #E5E8EB",marginTop:12,paddingTop:12,display:"flex",gap:16,alignItems:"center"}}>
          <Link href="/terms" className="vela-mobile-link" onClick={() => setMenuOpen(false)} style={{fontSize:12,color:"#9EA6B3",padding:0}}>이용약관</Link>
          <Link href="/privacy" className="vela-mobile-link" onClick={() => setMenuOpen(false)} style={{fontSize:12,color:"#9EA6B3",padding:0}}>개인정보처리방침</Link>
        </div>
      </div>
    </>
  );
}
