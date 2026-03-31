"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
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
        .vela-nav{position:fixed;top:0;left:0;right:0;z-index:100;height:64px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid #E5E8EB;display:flex;align-items:center}
        .vela-nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;width:100%;display:flex;align-items:center;justify-content:space-between}
        .vela-nav-logo{font-size:20px;font-weight:800;color:#191F28;text-decoration:none;letter-spacing:-0.02em}
        .vela-nav-logo span{color:#3182F6}
        .vela-nav-links{display:flex;align-items:center;gap:32px}
        .vela-nav-links a{font-size:15px;font-weight:500;color:#6B7684;text-decoration:none;transition:color .15s}
        .vela-nav-links a:hover{color:#191F28}
        .vela-nav-actions{display:flex;align-items:center;gap:12px}
        .vela-btn-login{font-size:15px;font-weight:600;color:#6B7684;text-decoration:none;transition:color .15s}
        .vela-btn-login:hover{color:#191F28}
        .vela-btn-start{background:#3182F6;color:#fff;padding:9px 20px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;transition:background .15s}
        .vela-btn-start:hover{background:#1B64DA}
        .vela-btn-logout{background:none;border:1px solid #E5E8EB;color:#6B7684;padding:8px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
        .vela-btn-logout:hover{border-color:#333D4B;color:#191F28}
        .vela-user-name{font-size:14px;font-weight:600;color:#333D4B}
        .vela-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
        .vela-hamburger span{display:block;width:22px;height:2px;background:#333D4B;border-radius:2px;transition:all .2s}
        .vela-mobile-menu{display:none;position:fixed;top:64px;left:0;right:0;background:#fff;border-bottom:1px solid #E5E8EB;padding:16px 24px;flex-direction:column;gap:4px;z-index:99}
        .vela-mobile-menu.open{display:flex}
        .vela-mobile-link{font-size:15px;font-weight:500;color:#333D4B;text-decoration:none;padding:12px 0;border-bottom:1px solid #F2F4F6}
        .vela-dropdown{position:relative}
        .vela-dropdown-btn{font-size:15px;font-weight:500;color:#6B7684;background:none;border:none;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;padding:0;transition:color .15s}
        .vela-dropdown-btn:hover{color:#191F28}
        .vela-dropdown-btn:hover .vela-dropdown-arrow{transform:rotate(180deg)}
        .vela-dropdown-arrow{font-size:10px;transition:transform .2s}
        .vela-dropdown-menu{position:absolute;top:calc(100% + 16px);left:50%;transform:translateX(-50%);background:#fff;border:1px solid #E5E8EB;border-radius:20px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);min-width:280px;display:none;z-index:200}
        .vela-dropdown:hover .vela-dropdown-menu{display:grid;grid-template-columns:1fr 1fr;gap:4px}
        .vela-dropdown-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;text-decoration:none;transition:background .15s}
        .vela-dropdown-item:hover{background:#F2F4F6}
        .vela-dropdown-icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .vela-dropdown-label{font-size:13px;font-weight:600;color:#191F28}
        .vela-dropdown-desc{font-size:11px;color:#9EA6B3;margin-top:1px}
        @media(max-width:768px){
          .vela-nav-links,.vela-nav-actions{display:none}
          .vela-hamburger{display:flex}
        }
      `}</style>

      <nav className="vela-nav">
        <div className="vela-nav-inner">
          <Link href="/" className="vela-nav-logo">VELA<span>.</span></Link>

          <div className="vela-nav-links">
            <a href="/#features">서비스</a>
            <div className="vela-dropdown">
              <button className="vela-dropdown-btn">
                도구 <span className="vela-dropdown-arrow">▾</span>
              </button>
              <div className="vela-dropdown-menu">
                {[
                  { icon:"📊", label:"수익 시뮬레이터",  desc:"매출·순이익·BEP 계산",  href:"/simulator" },
                  { icon:"🤖", label:"AI 전략 컨설팅",  desc:"Claude AI 맞춤 전략",   href:"/simulator" },
                  { icon:"📋", label:"POS 데이터 분석", desc:"엑셀 업로드 자동 분석",  href:"/simulator" },
                  { icon:"🎯", label:"목표 역산 계획",  desc:"목표 순이익 역산",       href:"/simulator" },
                  { icon:"💰", label:"투자금 회수 예측", desc:"회수 기간 자동 계산",   href:"/simulator" },
                  { icon:"📈", label:"월별 히스토리",   desc:"매출 추이 추적",         href:"/profile" },
                  { icon:"🎮", label:"경영 게임",       desc:"90일 경영 시뮬레이션",   href:"/game" },
                  { icon:"👥", label:"사장님 커뮤니티", desc:"수익 공유·업종 평균",    href:"/community" },
                ].map(item => (
                  <Link key={item.label} href={item.href} className="vela-dropdown-item">
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
            <a href="/#contact">문의</a>
          </div>

          <div className="vela-nav-actions">
            {user ? (
              <>
                <Link href="/profile" className="vela-user-name" style={{ textDecoration:"none", cursor:"pointer" }}>
                  {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "내 계정"}
                </Link>
                <Link href="/profile" style={{ background:"#F2F4F6", color:"#333D4B", padding:"8px 16px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", textDecoration:"none" }}>대시보드</Link>
                <Link href="/simulator" className="vela-btn-start">시뮬레이터 →</Link>
                <button className="vela-btn-logout" onClick={handleLogout}>로그아웃</button>
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
        <a href="/#features" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>서비스</a>
        <div style={{paddingBottom:"4px",borderBottom:"1px solid #F2F4F6"}}>
          <p style={{fontSize:"11px",fontWeight:700,color:"#9EA6B3",padding:"10px 0 6px",letterSpacing:"0.5px"}}>도구</p>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {[
              {icon:"📊",label:"수익 시뮬레이터",href:"/simulator"},
              {icon:"📋",label:"POS 데이터 분석",href:"/simulator"},
              {icon:"🎯",label:"목표 역산 계획",href:"/simulator"},
              {icon:"💰",label:"투자금 회수 예측",href:"/simulator"},
              {icon:"📈",label:"월별 히스토리",href:"/profile"},
              {icon:"🎮",label:"경영 시뮬레이션 게임",href:"/game"},
              {icon:"👥",label:"사장님 커뮤니티",href:"/community"},
            ].map(item=>(
              <Link key={item.label} href={item.href} className="vela-mobile-link" onClick={() => setMenuOpen(false)} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/pricing" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>요금제</Link>
        <a href="/#contact" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>문의</a>
        {user ? (
          <>
            <Link href="/profile" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>대시보드</Link>
            <button className="vela-mobile-link" style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onClick={() => { handleLogout(); setMenuOpen(false); }}>로그아웃</button>
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
