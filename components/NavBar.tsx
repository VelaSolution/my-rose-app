"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

const TOOLS = [
  { icon:"🧮", label:"메뉴별 원가 계산기", desc:"원가율·건당 순익 자동 계산",       href:"/tools/menu-cost" },
  { icon:"👥", label:"인건비 스케줄러",     desc:"주간·월간 인건비 예측",             href:"/tools/labor" },
  { icon:"🧾", label:"세금 계산기",         desc:"부가세·소득세 예상액 산출",         href:"/tools/tax" },
  { icon:"📄", label:"손익계산서 PDF",      desc:"월별 P&L 리포트 PDF 출력",         href:"/tools/pl-report" },
  { icon:"✅", label:"창업 체크리스트",     desc:"인허가·준비물 단계별 가이드",       href:"/tools/startup-checklist" },
  { icon:"📱", label:"SNS 콘텐츠 생성기",  desc:"인스타 캡션 AI 자동 생성",         href:"/tools/sns-content" },
  { icon:"💬", label:"리뷰 답변 생성기",    desc:"AI 맞춤 답변 초안 작성",           href:"/tools/review-reply" },
  { icon:"🗺️", label:"상권 분석 도우미",   desc:"AI 상권 적합도 평가 리포트",       href:"/tools/area-analysis" },
] as const;

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        .vela-nav{position:fixed;top:0;left:0;right:0;z-index:100;height:64px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid #E5E8EB;display:flex;align-items:center;font-family:var(--font-geist-sans),'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
        .vela-nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;width:100%;display:flex;align-items:center;justify-content:space-between}
        .vela-nav-logo{font-size:20px;font-weight:800;color:#191F28;text-decoration:none;letter-spacing:-0.02em;font-family:inherit}
        .vela-nav-logo span{color:#3182F6}
        .vela-nav-links{display:flex;align-items:center;gap:28px}
        .vela-nav-links a{font-size:15px;font-weight:500;color:#6B7684;text-decoration:none;transition:color .15s;font-family:inherit}
        .vela-nav-links a:hover{color:#191F28}
        .vela-nav-actions{display:flex;align-items:center;gap:10px}
        .vela-btn-login{font-size:14px;font-weight:600;color:#6B7684;text-decoration:none;transition:color .15s;font-family:inherit}
        .vela-btn-login:hover{color:#191F28}
        .vela-btn-dashboard{background:#F2F4F6;color:#333D4B;padding:9px 16px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;transition:all .15s;font-family:inherit;line-height:1}
        .vela-btn-dashboard:hover{background:#E5E8EB}
        .vela-btn-logout{background:none;border:1px solid #E5E8EB;color:#6B7684;padding:9px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;line-height:1}
        .vela-btn-logout:hover{border-color:#333D4B;color:#191F28}
        .vela-btn-start{background:#3182F6;color:#fff;padding:9px 18px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;transition:background .15s;font-family:inherit;line-height:1}
        .vela-btn-start:hover{background:#1B64DA}
        .vela-user-name{font-size:14px;font-weight:600;color:#333D4B;text-decoration:none;cursor:pointer;font-family:inherit}
        .vela-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
        .vela-hamburger span{display:block;width:22px;height:2px;background:#333D4B;border-radius:2px;transition:all .2s}
        .vela-mobile-menu{display:none;position:fixed;top:64px;left:0;right:0;background:#fff;border-bottom:1px solid #E5E8EB;padding:16px 24px;flex-direction:column;gap:0;z-index:99;max-height:80vh;overflow-y:auto;font-family:inherit}
        .vela-mobile-menu.open{display:flex}
        .vela-mobile-link{font-size:15px;font-weight:500;color:#333D4B;text-decoration:none;padding:12px 0;border-bottom:1px solid #F2F4F6;display:block;font-family:inherit}
        .vela-dropdown{position:relative}
        .vela-dropdown-btn{font-size:15px;font-weight:500;color:#6B7684;background:none;border:none;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;padding:0;transition:color .15s}
        .vela-dropdown-btn:hover{color:#191F28}
        .vela-dropdown-arrow{font-size:10px;transition:transform .2s;display:inline-block}
        .vela-dropdown:hover .vela-dropdown-arrow{transform:rotate(180deg)}
        .vela-dropdown-menu{position:absolute;top:100%;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #E5E8EB;border-radius:20px;padding:14px 10px 10px;box-shadow:0 8px 32px rgba(0,0,0,.12);min-width:520px;display:none;z-index:200;grid-template-columns:1fr 1fr;gap:4px}
        .vela-dropdown:hover .vela-dropdown-menu{display:grid}
        .vela-dropdown-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;text-decoration:none;transition:background .15s}
        .vela-dropdown-item:hover{background:#F2F4F6}
        .vela-dropdown-icon{font-size:20px;flex-shrink:0;margin-top:1px}
        .vela-dropdown-label{font-size:13px;font-weight:600;color:#191F28;margin:0 0 2px;font-family:inherit}
        .vela-dropdown-desc{font-size:11px;color:#9EA6B3;margin:0;font-family:inherit}
        @media(max-width:768px){.vela-nav-links,.vela-nav-actions{display:none}.vela-hamburger{display:flex}}
      `}</style>

      <nav className="vela-nav">
        <div className="vela-nav-inner">
          <Link href="/" className="vela-nav-logo">VELA<span>.</span></Link>

          <div className="vela-nav-links">
            <a href="/tools">서비스</a>
            <div className="vela-dropdown">
              <Link href="/tools" className="vela-dropdown-btn" style={{ textDecoration:"none" }}>도구 <span className="vela-dropdown-arrow">▾</span></Link>
              <div className="vela-dropdown-menu">
                {TOOLS.map(item => (
                  <Link key={item.href} href={item.href} className="vela-dropdown-item">
                    <span className="vela-dropdown-icon">{item.icon}</span>
                    <div>
                      <p className="vela-dropdown-label">{item.label}</p>
                      <p className="vela-dropdown-desc">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/community">커뮤니티</Link>
            <Link href="/game">🎮 게임</Link>
            <Link href="/pricing">요금제</Link>
            <a href="mailto:mnhyuk@velaanalytics.com">문의</a>
          </div>

          <div className="vela-nav-actions">
            {user ? (
              <>
                <Link href="/profile" className="vela-user-name">
                  {user.user_metadata?.nickname ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "내 계정"}
                </Link>
                <Link href="/dashboard" className="vela-btn-dashboard">대시보드</Link>
                <button className="vela-btn-logout" onClick={handleLogout}>로그아웃</button>
                <Link href="/simulator" className="vela-btn-start">시뮬레이터 →</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="vela-btn-login">로그인</Link>
                <Link href="/signup" className="vela-btn-start">무료 시작</Link>
              </>
            )}
          </div>

          <button className="vela-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      <div className={`vela-mobile-menu${menuOpen ? " open" : ""}`}>
        <a href="/tools" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>서비스</a>
        <div style={{ borderBottom:"1px solid #F2F4F6", paddingBottom:"8px" }}>
          <p style={{ fontSize:"11px", fontWeight:700, color:"#9EA6B3", padding:"12px 0 6px", letterSpacing:"0.5px" }}>도구</p>
          {TOOLS.map(item => (
            <Link key={item.href} href={item.href} className="vela-mobile-link" onClick={() => setMenuOpen(false)} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>
        <Link href="/community" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>커뮤니티</Link>
        <Link href="/game" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>🎮 게임</Link>
        <Link href="/pricing" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>요금제</Link>
        <a href="mailto:mnhyuk@velaanalytics.com" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>문의</a>
        {user ? (
          <>
            <Link href="/dashboard" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>대시보드</Link>
            <button className="vela-mobile-link" style={{ background:"none", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"inherit", fontSize:"15px", fontWeight:"500", color:"#333D4B", padding:"12px 0" }} onClick={() => { handleLogout(); setMenuOpen(false); }}>로그아웃</button>
          </>
        ) : (
          <>
            <Link href="/login" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>로그인</Link>
            <Link href="/signup" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>무료 시작</Link>
          </>
        )}
      </div>
    </>
  );
}
