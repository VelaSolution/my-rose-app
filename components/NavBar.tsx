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
            <Link href="/simulator">시뮬레이터</Link>
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
        <Link href="/simulator" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>시뮬레이터</Link>
        <Link href="/community" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>커뮤니티</Link>
        <Link href="/game" className="vela-mobile-link" onClick={() => setMenuOpen(false)}>🎮 게임</Link>
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
