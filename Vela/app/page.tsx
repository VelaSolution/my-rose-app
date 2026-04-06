"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import OnboardingModal from "@/components/OnboardingModal";
import { PLANS } from "@/lib/plans";
import MonthlyReminder from "@/components/MonthlyReminder";
import PromoModal from "@/components/PromoModal";
import EventBanner from "@/components/EventBanner";
import EventPopup from "@/components/EventPopup";
import { useTranslation } from "@/lib/i18n";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(24px)", transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function HeroMiniSim() {
  const t = useTranslation();
  const [seats, setSeats] = useState(36);
  const [spend, setSpend] = useState(25000);
  const [turn, setTurn] = useState(1.6);
  const sales = Math.round(seats * spend * turn * 26);
  const cost = Math.round(sales * 0.35 + 6500000 + 2000000 + 500000);
  const profit = sales - cost;
  const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : "0";
  const fmt = (n: number) => Math.abs(n).toLocaleString("ko-KR");

  return (
    <div style={{background:"#fff",borderRadius:24,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",border:"1px solid #E5E8EB",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,right:0,width:120,height:120,background:"radial-gradient(circle,rgba(49,130,246,0.08),transparent)",borderRadius:"0 0 0 120px"}} />
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:700,color:"#191F28"}}>🔮 {t("hero.preview")}</span>
        </div>
        <span style={{fontSize:11,color:"#9EA6B3",background:"#F2F4F6",padding:"3px 10px",borderRadius:100,fontWeight:600}}>{t("hero.drag")}</span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,color:"#6B7684",fontWeight:500}}>{t("hero.seats")}</span>
            <span style={{fontSize:14,fontWeight:700,color:"#191F28"}}>{seats}</span>
          </div>
          <input type="range" min={5} max={80} value={seats} onChange={e=>setSeats(Number(e.target.value))}
            style={{width:"100%",accentColor:"#3182F6",height:6}} />
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,color:"#6B7684",fontWeight:500}}>{t("hero.avgSpend")}</span>
            <span style={{fontSize:14,fontWeight:700,color:"#191F28"}}>{spend.toLocaleString()} KRW</span>
          </div>
          <input type="range" min={3000} max={100000} step={1000} value={spend} onChange={e=>setSpend(Number(e.target.value))}
            style={{width:"100%",accentColor:"#3182F6",height:6}} />
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,color:"#6B7684",fontWeight:500}}>{t("hero.turnover")}</span>
            <span style={{fontSize:14,fontWeight:700,color:"#191F28"}}>{turn.toFixed(1)}x</span>
          </div>
          <input type="range" min={0.5} max={6} step={0.1} value={turn} onChange={e=>setTurn(Number(e.target.value))}
            style={{width:"100%",accentColor:"#3182F6",height:6}} />
        </div>
      </div>

      <div style={{background:"#F9FAFB",borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,color:"#9EA6B3",fontWeight:600}}>{t("hero.monthlySales")}</span>
          <span style={{fontSize:20,fontWeight:800,color:"#191F28",letterSpacing:-1}}>{fmt(sales)} KRW</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#9EA6B3",fontWeight:600}}>{t("hero.profit")}</span>
          <span style={{fontSize:22,fontWeight:800,color:profit>=0?"#059669":"#EF4444",letterSpacing:-1}}>{profit>=0?"+":"-"}{fmt(profit)} KRW</span>
        </div>
        <div style={{marginTop:8,height:4,borderRadius:4,background:"#E5E8EB",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:4,background:profit>=0?"#059669":"#EF4444",width:`${Math.min(Math.max(Number(margin),0),100)}%`,transition:"width 0.3s"}} />
        </div>
        <div style={{textAlign:"right",marginTop:4}}>
          <span style={{fontSize:11,color:profit>=0?"#059669":"#EF4444",fontWeight:600}}>{t("hero.margin")} {margin}%</span>
        </div>
      </div>

      <Link href="/simulator" style={{display:"block",width:"100%",textAlign:"center",background:"#3182F6",color:"#fff",padding:"13px 0",borderRadius:12,fontSize:14,fontWeight:700,textDecoration:"none",transition:"background 0.15s"}}>
        {t("hero.analyze")}
      </Link>
    </div>
  );
}

function LandingContent() {
  const t = useTranslation();
  const formMsgRef = useRef<HTMLParagraphElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const btn = submitBtnRef.current;
    const msg = formMsgRef.current;
    if (!btn || !msg) return;

    const name = nameRef.current?.value ?? "";
    const email = emailRef.current?.value ?? "";
    const message = messageRef.current?.value ?? "";

    btn.textContent = "전송 중...";
    btn.disabled = true;
    msg.style.display = "none";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        btn.textContent = "전송 완료 ✓";
        msg.style.display = "block";
        msg.style.color = "#059669";
        msg.textContent = "문의가 접수되었습니다. 빠르게 연락드리겠습니다.";
        (e.target as HTMLFormElement).reset();
      } else {
        btn.textContent = "재시도";
        msg.style.display = "block";
        msg.style.color = "#ef4444";
        msg.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        btn.disabled = false;
      }
    } catch {
      btn.textContent = "재시도";
      msg.style.display = "block";
      msg.style.color = "#ef4444";
      msg.textContent = "네트워크 오류가 발생했습니다.";
      btn.disabled = false;
    }

    setTimeout(() => {
      if (btn && btn.textContent === "전송 완료 ✓") {
        btn.textContent = "문의 보내기";
        btn.disabled = false;
      }
    }, 4000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--blue:#3182F6;--blue-dark:#1B64DA;--blue-light:#EBF3FF;--gray-50:#F9FAFB;--gray-100:#F2F4F6;--gray-200:#E5E8EB;--gray-400:#9EA6B3;--gray-600:#6B7684;--gray-800:#333D4B;--gray-900:#191F28}
        html{scroll-behavior:smooth}
        body{font-family:'Pretendard',-apple-system,sans-serif;color:var(--gray-900);background:#fff;line-height:1.6;overflow-x:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(49,130,246,0.4)}50%{box-shadow:0 0 0 8px rgba(49,130,246,0)}}
        .fade-init{opacity:0;animation:fadeUp .7s ease forwards}
        .d1{animation-delay:.1s}.d2{animation-delay:.25s}.d3{animation-delay:.4s}.d4{animation-delay:.55s}
        .step-card-hover:hover{transform:translateY(-6px);box-shadow:0 16px 48px rgba(0,0,0,.08);border-color:transparent}
        .hero{min-height:100vh;display:flex;align-items:center;padding:120px 24px 80px;position:relative;overflow:hidden}
        .hero-bg{position:absolute;top:-200px;right:-200px;width:800px;height:800px;background:radial-gradient(ellipse,rgba(49,130,246,0.08) 0%,transparent 70%);pointer-events:none;filter:blur(40px)}
        .hero-bg2{position:absolute;bottom:-100px;left:-100px;width:500px;height:500px;background:radial-gradient(ellipse,rgba(99,102,241,0.06) 0%,transparent 70%);pointer-events:none;filter:blur(40px)}
        .hero-inner{max-width:1100px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1}
        .hero-tag{display:inline-flex;align-items:center;gap:8px;background:var(--blue-light);color:var(--blue);font-size:13px;font-weight:600;padding:6px 14px;border-radius:100px;margin-bottom:24px}
        .hero-tag-dot{width:6px;height:6px;background:var(--blue);border-radius:50%}
        .hero-title{font-size:clamp(36px,4.5vw,58px);font-weight:800;line-height:1.15;color:var(--gray-900);margin-bottom:20px;letter-spacing:-0.02em}
        .hero-title span{color:var(--blue)}
        .hero-desc{font-size:18px;color:var(--gray-600);line-height:1.7;margin-bottom:40px}
        .hero-actions{display:flex;gap:12px;flex-wrap:wrap}
        .btn-primary{background:var(--blue);color:#fff;padding:16px 32px;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;transition:all .2s;display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(49,130,246,0.3)}
        .btn-primary:hover{background:var(--blue-dark);transform:translateY(-2px);box-shadow:0 6px 20px rgba(49,130,246,0.4)}
        .btn-secondary{background:var(--gray-100);color:var(--gray-800);padding:16px 28px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;transition:background .15s;display:inline-flex;align-items:center;gap:8px}
        .btn-secondary:hover{background:var(--gray-200)}
        .hero-stats{display:flex;gap:32px;margin-top:48px;padding-top:40px;border-top:1px solid var(--gray-200)}
        .stat-num{font-size:32px;font-weight:900;color:var(--gray-900);letter-spacing:-0.03em;animation:countUp .8s ease forwards;animation-delay:.6s;opacity:0}
        .stat-num span{color:var(--blue)}
        .stat-label{font-size:13px;color:var(--gray-400);margin-top:2px}
        .hero-card{background:var(--gray-50);border-radius:24px;padding:32px;border:1px solid var(--gray-200)}
        .hero-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .hero-card-title{font-size:14px;font-weight:600;color:var(--gray-600)}
        .hero-card-badge{background:#ECFDF5;color:#059669;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px}
        .hero-metric-label{font-size:13px;color:var(--gray-400);margin-bottom:6px}
        .hero-metric-value{font-size:32px;font-weight:800;letter-spacing:-0.02em;margin-bottom:16px}
        .green{color:#059669}.red{color:#DC2626}
        .hero-bar-wrap{height:8px;background:var(--gray-200);border-radius:100px;overflow:hidden;margin-bottom:24px}
        .hero-bar{height:100%;background:var(--blue);border-radius:100px;width:68%}
        .hero-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid var(--gray-100);font-size:14px}
        .hero-row-label{color:var(--gray-600)}
        .hero-row-value{font-weight:600;color:var(--gray-900)}
        section{padding:100px 24px}
        .section-inner{max-width:1100px;margin:0 auto}
        .section-tag{display:inline-block;background:var(--blue-light);color:var(--blue);font-size:13px;font-weight:600;padding:5px 14px;border-radius:100px;margin-bottom:16px}
        .section-title{font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;color:var(--gray-900);margin-bottom:16px;line-height:1.15}
        .section-desc{font-size:17px;color:var(--gray-600);line-height:1.7;max-width:500px}
        .features-bg{background:var(--gray-50)}
        .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}
        .feature-card{background:#fff;border-radius:20px;padding:32px;border:1px solid var(--gray-200);transition:transform .2s,box-shadow .2s}
        .feature-card:hover{transform:translateY(-6px);box-shadow:0 16px 48px rgba(0,0,0,.1);border-color:var(--blue)}
        .feature-icon{width:48px;height:48px;border-radius:14px;background:var(--blue-light);display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
        .feature-title{font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:10px}
        .feature-desc{font-size:14px;color:var(--gray-600);line-height:1.7}
        .feature-tag{display:inline-block;margin-top:16px;font-size:12px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:4px 10px;border-radius:100px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px;text-align:center}
        .step-num{width:56px;height:56px;background:var(--blue);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin:0 auto 20px}
        .step-title{font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:8px}
        .step-desc{font-size:14px;color:var(--gray-600);line-height:1.7}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}
        .pricing-card{background:#fff;border:2px solid var(--gray-200);border-radius:24px;padding:36px 32px;position:relative;transition:all .25s}
        .pricing-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(0,0,0,.08)}
        .pricing-card.popular{border-color:var(--blue)}
        .pricing-popular-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--blue);color:#fff;font-size:12px;font-weight:700;padding:5px 16px;border-radius:100px;white-space:nowrap}
        .pricing-plan{font-size:14px;font-weight:600;color:var(--gray-600);margin-bottom:8px}
        .pricing-price{font-size:40px;font-weight:800;color:var(--gray-900);letter-spacing:-0.02em;margin-bottom:4px}
        .pricing-price span{font-size:18px;font-weight:500;color:var(--gray-400)}
        .pricing-desc{font-size:14px;color:var(--gray-600);margin-bottom:28px}
        .pricing-features{list-style:none;margin-bottom:28px}
        .pricing-features li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--gray-700);padding:8px 0;border-bottom:1px solid var(--gray-100)}
        .pricing-features li:last-child{border-bottom:none}
        .pricing-check{width:20px;height:20px;background:#ECFDF5;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:#059669}
        .pricing-btn{width:100%;padding:14px;border-radius:12px;font-size:15px;font-weight:600;text-align:center;text-decoration:none;display:block;transition:all .15s;border:none;cursor:pointer;font-family:inherit}
        .pricing-btn-blue{background:var(--blue);color:#fff}
        .pricing-btn-blue:hover{background:var(--blue-dark)}
        .pricing-btn-gray{background:var(--gray-100);color:var(--gray-800)}
        .pricing-btn-gray:hover{background:var(--gray-200)}
        .testi-bg{background:var(--gray-900)}
        .testi-bg .section-title{color:#fff}
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}
        .testi-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px}
        .testi-stars{color:#F59E0B;font-size:14px;margin-bottom:16px}
        .testi-text{font-size:15px;color:rgba(255,255,255,.8);line-height:1.7;margin-bottom:20px}
        .testi-author{display:flex;align-items:center;gap:12px}
        .testi-avatar{width:40px;height:40px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0}
        .testi-name{font-size:14px;font-weight:600;color:#fff}
        .testi-role{font-size:12px;color:var(--gray-400)}
        .cta-bg{background:var(--blue);text-align:center}
        .cta-title{font-size:clamp(28px,4vw,48px);font-weight:800;color:#fff;letter-spacing:-0.02em;margin-bottom:16px}
        .cta-desc{font-size:18px;color:rgba(255,255,255,.8);margin-bottom:40px}
        .btn-white{background:#fff;color:var(--blue);padding:16px 32px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;display:inline-block;transition:transform .15s}
        .btn-white:hover{transform:translateY(-2px)}
        .contact-layout{display:grid;grid-template-columns:1fr 1.4fr;gap:80px;align-items:start;margin-top:56px}
        .contact-info{display:flex;flex-direction:column;gap:28px}
        .contact-label{font-size:12px;font-weight:600;color:var(--blue);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .contact-value{font-size:15px;color:var(--gray-700)}
        .contact-form{display:flex;flex-direction:column;gap:14px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .field-label{display:block;font-size:13px;font-weight:600;color:var(--gray-600);margin-bottom:6px}
        .field-input{width:100%;padding:13px 16px;background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:10px;font-family:'Pretendard',sans-serif;font-size:14px;color:var(--gray-900);outline:none;transition:border-color .15s,background .15s}
        .field-input:focus{border-color:var(--blue);background:#fff;box-shadow:0 0 0 3px rgba(49,130,246,.1)}
        textarea.field-input{resize:vertical;min-height:120px;line-height:1.6}
        .form-submit{background:var(--blue);color:#fff;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:'Pretendard',sans-serif;transition:background .15s;align-self:flex-start}
        .form-submit:hover{background:var(--blue-dark)}
        .form-msg{font-size:13px;color:var(--blue);display:none;margin-top:4px}
        footer{background:var(--gray-900);padding:60px 24px 40px}
        .footer-inner{max-width:1100px;margin:0 auto}
        .footer-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}
        .footer-logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em}
        .footer-logo span{color:var(--blue)}
        .footer-links{display:flex;gap:24px}
        .footer-links a{font-size:14px;color:var(--gray-400);text-decoration:none;transition:color .15s}
        .footer-links a:hover{color:#fff}
        .footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:24px;border-top:1px solid rgba(255,255,255,.08)}
        .footer-copy{font-size:13px;color:var(--gray-400)}
        .footer-legal{display:flex;gap:16px}
        .footer-legal a{font-size:13px;color:var(--gray-400);text-decoration:none}
        .footer-legal a:hover{color:#fff}
        @media(max-width:1024px){.hero-inner{grid-template-columns:1fr;gap:48px}.features-grid,.pricing-grid,.testi-grid{grid-template-columns:1fr 1fr}.steps-grid{grid-template-columns:1fr 1fr}.contact-layout{grid-template-columns:1fr;gap:48px}}
        @media(max-width:640px){.features-grid,.pricing-grid,.testi-grid,.steps-grid{grid-template-columns:1fr}.hero-stats{flex-direction:column;gap:20px}.form-row{grid-template-columns:1fr}.footer-top{flex-direction:column;gap:24px}.footer-bottom{flex-direction:column;gap:16px;text-align:center}.hero-actions{flex-direction:column}}
      `}</style>

      


      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg" /><div className="hero-bg2" />
        <div className="hero-inner">
          <div>
            <div className="fade-init d1">
              <div className="hero-tag"><span className="hero-tag-dot" />{t("hero.tag")}</div>
              <h1 className="hero-title">{t("hero.title1")}<br /><span>{t("hero.title2")}</span></h1>
              <p className="hero-desc">{t("hero.desc")}</p>
              <div className="hero-actions">
                <Link href="/signup" className="btn-primary">{t("hero.cta")}</Link>
                <a href="#features" className="btn-secondary">{t("hero.cta2")}</a>
              </div>
              <p style={{fontSize:13,color:"var(--gray-400)",marginTop:12}}>카카오 로그인으로 3초 만에 시작 · 무료 플랜 제공</p>
              <div className="hero-stats">
                <div><div className="stat-num">500<span>+</span></div><div className="stat-label">사장님 사용 중</div></div>
                <div><div className="stat-num">5<span>개</span></div><div className="stat-label">업종 지원</div></div>
                <div><div className="stat-num">20<span>+</span></div><div className="stat-label">재무 지표</div></div>
                <div><div className="stat-num">AI</div><div className="stat-label">실시간 전략</div></div>
              </div>
            </div>
          </div>
          <div className="fade-init d2">
            <HeroMiniSim />
          </div>
        </div>
      </section>

      {/* 이벤트 배너 — 랜딩 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <FadeIn>
          <EventBanner />
        </FadeIn>
      </div>

      {/* FEATURES */}
      <section id="features" className="features-bg">
        <div className="section-inner">
          <FadeIn><span className="section-tag">{t("features.tag")}</span><h2 className="section-title">{t("features.title")}</h2><p className="section-desc">{t("features.desc")}</p></FadeIn>
          <div className="features-grid">
            {[
              { icon:"🧮", title:"메뉴별 원가 계산기",  desc:"식재료 원가 입력 → 원가율·건당 순익 자동 계산. 메뉴 가격 결정에 바로 활용하세요.",      tag:"원가 계산",  href:"/tools/menu-cost" },
              { icon:"💰", title:"AI 메뉴 가격 추천",   desc:"원가 + 경쟁 가격대 입력 → AI가 적정 메뉴 가격과 가격 전략을 추천합니다.",              tag:"AI · NEW",   href:"/tools/menu-pricing" },
              { icon:"⚖️", title:"인건비 계산기 (법정)", desc:"주휴수당·야간수당·4대보험까지 자동 반영. 실제 인건비를 정확하게 파악하세요.",            tag:"법정 계산",  href:"/tools/labor-law" },
              { icon:"🛵", title:"배달앱 매출 분석기",   desc:"배민·쿠팡이츠 정산서 업로드 → 수수료·실매출·건당 이익을 AI가 자동 분석합니다.",         tag:"AI · NEW",   href:"/tools/delivery-analysis" },
              { icon:"📊", title:"리뷰 감정 분석",      desc:"네이버·배민 리뷰 붙여넣기 → AI가 감정·키워드·개선점을 분석해 한눈에 보여줍니다.",       tag:"AI · NEW",   href:"/tools/review-analysis" },
              { icon:"💳", title:"카드매출 자동 수집",   desc:"사업자등록번호만 입력하면 여신금융협회를 통해 카드사별 매출을 자동으로 조회합니다.",       tag:"자동 연동",  href:"/tools/card-sales" },
              { icon:"📝", title:"일일 매출 기록",       desc:"매일 매출·고객수만 입력하면 월간 자동 집계 + 요일별 매출 패턴을 분석합니다.",           tag:"매출 관리",  href:"/tools/daily-sales" },
              { icon:"📱", title:"SNS 콘텐츠 생성기",   desc:"메뉴·이벤트 정보 입력 → 인스타 캡션 AI 자동 생성. 매일 고민하는 SNS 포스팅 해결.",     tag:"AI · SNS",   href:"/tools/sns-content" },
              { icon:"💬", title:"리뷰 답변 생성기",     desc:"고객 리뷰 붙여넣기 → AI가 맞춤 답변 초안 작성. 악성 리뷰도 프로답게 대응하세요.",        tag:"AI · 리뷰",  href:"/tools/review-reply" },
              { icon:"🗺️", title:"상권 분석 도우미",    desc:"입지 조건 입력 → AI 상권 적합도 평가 리포트. 창업 전 상권 리스크를 미리 파악하세요.",    tag:"AI · 상권",  href:"/tools/area-analysis" },
              { icon:"🧾", title:"세금 계산기",          desc:"매출 기반 부가세·종합소득세 예상액 자동 산출. 세금 폭탄 없이 미리 준비하세요.",           tag:"세금 예측",  href:"/tools/tax" },
              { icon:"📄", title:"손익계산서 PDF",       desc:"시뮬레이션 데이터로 월별 P&L 리포트 PDF 출력. 투자자·세무사에게 바로 공유 가능.",        tag:"PDF 출력",   href:"/tools/pl-report" },
              { icon:"🔍", title:"경쟁매장 가격 조사",   desc:"주변 매장 메뉴 가격을 기록하고 내 가격 포지셔닝을 파악하세요.",                          tag:"경쟁 분석",  href:"/tools/competitor-pricing" },
              { icon:"🔄", title:"인수인계 체크리스트",   desc:"매장 양도양수 시 빠뜨리면 안 되는 36개 필수 항목을 체크하세요.",                          tag:"인수인계",   href:"/tools/handover" },
              { icon:"🧾", title:"세무사 연결",          desc:"외식업 전문 세무사 매칭. 시뮬레이션 데이터 기반으로 정확한 세무 상담을 받으세요.",          tag:"세무 상담",  href:"/tools/tax-advisor" },
              { icon:"🤝", title:"식자재 공동구매",       desc:"같은 동네 사장님끼리 식자재 공동구매하면 단가를 10~20% 낮출 수 있어요.",                 tag:"공동구매",   href:"/tools/group-buy" },
              { icon:"🎁", title:"사장님 추천 프로그램",   desc:"친구를 초대하면 양쪽 모두 스탠다드 플랜 1개월 무료 혜택!",                              tag:"추천 보상",  href:"/referral" },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 60}>
                <Link href={f.href} style={{ textDecoration: "none" }}>
                  <div className="feature-card">
                    <div className="feature-icon">{f.icon}</div>
                    <div className="feature-title">{f.title}</div>
                    <div className="feature-desc">{f.desc}</div>
                    <span className="feature-tag">{f.tag}</span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section>
        <div className="section-inner">
          <FadeIn><div style={{ textAlign: "center" }}><span className="section-tag">{t("steps.tag")}</span><h2 className="section-title" style={{ textAlign: "center" }}>{t("steps.title")}</h2></div></FadeIn>
          <div className="steps-grid">
            {[
              { num: "1", icon: "📝", title: "3분 만에 입력", desc: "업종·좌석·객단가·비용 구조를 3단계로 간단하게 입력합니다. POS 파일이 있으면 바로 업로드해도 됩니다.", delay: 0, accent: "#3182F6" },
              { num: "2", icon: "🤖", title: "AI가 즉시 분석", desc: "입력 즉시 20개 이상의 재무 지표가 계산되고 AI가 현재 상태를 진단합니다.", delay: 100, accent: "#7C3AED" },
              { num: "3", icon: "🚀", title: "바로 실행", desc: "AI 추천 전략을 확인하고 채팅으로 추가 질문하며 바로 실행 계획을 세웁니다.", delay: 200, accent: "#059669" },
            ].map((s) => (
              <FadeIn key={s.num} delay={s.delay}>
                <div style={{background:"#fff",borderRadius:24,padding:"36px 28px",border:"2px solid #E5E8EB",transition:"all 0.25s",position:"relative",overflow:"hidden"}} className="step-card-hover">
                  <div style={{position:"absolute",top:0,left:0,width:"100%",height:4,background:s.accent}} />
                  <div style={{fontSize:40,marginBottom:12}}>{s.icon}</div>
                  <div style={{display:"inline-block",background:s.accent+"18",color:s.accent,fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:100,marginBottom:12}}>STEP {s.num}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="features-bg">
        <div className="section-inner">
          <FadeIn><span className="section-tag">{t("pricing.tag")}</span><h2 className="section-title">{t("pricing.title")}</h2><p className="section-desc">{t("pricing.desc")}</p></FadeIn>
          <div className="pricing-grid">
            {PLANS.map((p) => (
              <FadeIn key={p.plan}>
                <div className={`pricing-card${p.popular ? " popular" : ""}`}>
                  {p.popular && <div className="pricing-popular-badge">가장 인기</div>}
                  <div className="pricing-plan">{p.plan}</div>
                  <div className="pricing-price">{p.price}<span>{p.unit}</span></div>
                  <div className="pricing-desc">{p.desc}</div>
                  <ul className="pricing-features">{p.landingFeatures.map((f: string) => <li key={f}><span className="pricing-check">✓</span>{f}</li>)}</ul>
                  <Link href={p.href} className={`pricing-btn ${p.cls}`}>{p.btn}</Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testi-bg">
        <div className="section-inner">
          <FadeIn><span className="section-tag" style={{ background: "rgba(255,255,255,.1)", color: "#93C5FD" }}>{t("reviews.tag")}</span><h2 className="section-title">{t("reviews.title")}</h2></FadeIn>
          <div className="testi-grid">
            {[
              { text: "원가율이 38%인 줄 몰랐는데 VELA로 확인하고 메뉴를 조정했더니 월 120만원 절감됐어요. 숫자를 보니 어디서 돈이 새는지 바로 보이더라고요.", name: "김○○", role: "카페 운영 3년차", av: "김", delay: 0 },
              { text: "AI가 배달 채널 추가를 추천해줬는데, 실행 후 월 매출이 20% 올랐습니다. 순이익도 월 80만원 증가했어요.", name: "박○○", role: "분식점 사장님", av: "박", delay: 80 },
              { text: "창업 전에 VELA로 시뮬레이션 돌려보니 초기 투자금 회수에 14개월 걸린다는 걸 미리 알 수 있었어요. 덕분에 보증금 협상도 자신 있게 했습니다.", name: "이○○", role: "파인다이닝 예비 창업자", av: "이", delay: 160 },
            ].map((t) => (
              <FadeIn key={t.name} delay={t.delay}>
                <div className="testi-card">
                  <div className="testi-stars">★★★★★</div>
                  <div className="testi-text">&ldquo;{t.text}&rdquo;</div>
                  <div className="testi-author">
                    <div className="testi-avatar">{t.av}</div>
                    <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}</div></div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-bg">
        <div className="section-inner">
          <FadeIn>
            <h2 className="cta-title">{t("cta.title")}</h2>
            <p className="cta-desc">{t("cta.desc")}</p>
            <Link href="/signup" className="btn-white">{t("cta.btn")} →</Link>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="section-inner">
          <FadeIn><span className="section-tag">FAQ</span><h2 className="section-title">자주 묻는 질문</h2></FadeIn>
          <div style={{ maxWidth: 700, margin: "40px auto 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { q: "VELA는 어떤 서비스인가요?", a: "VELA는 외식업 사장님을 위한 AI 기반 경영 분석 도구입니다. 수익 시뮬레이션, AI 브리핑, 메뉴 원가 분석 등 매장 운영에 필요한 핵심 기능을 제공합니다." },
              { q: "무료 플랜에서 유료로 전환하면 데이터가 유지되나요?", a: "네, 기존에 저장한 시뮬레이션 데이터는 모두 유지됩니다. 플랜 변경 후 추가 기능이 즉시 활성화됩니다." },
              { q: "언제든지 구독을 취소할 수 있나요?", a: "네, 구독은 언제든 취소 가능합니다. 취소 후에도 결제된 기간 동안은 유료 기능을 계속 사용하실 수 있습니다." },
              { q: "결제는 어떤 방법으로 가능한가요?", a: "신용카드, 체크카드 등 토스페이먼츠를 통한 다양한 결제 방법을 지원합니다." },
              { q: "팀 플랜은 어떻게 사용하나요?", a: "프로 플랜에서 팀 멤버를 초대하면 같은 매장 데이터를 공유하며 함께 분석할 수 있습니다. 초대받은 멤버는 별도 요금이 없습니다." },
            ].map((faq) => (
              <FadeIn key={faq.q}>
                <div style={{ background: "#fff", border: "1px solid var(--gray-200)", borderRadius: 16, padding: "20px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-900)", marginBottom: 8 }}>Q. {faq.q}</div>
                  <div style={{ fontSize: 14, color: "var(--gray-600)", lineHeight: 1.7 }}>{faq.a}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <div className="section-inner">
          <FadeIn><span className="section-tag">문의</span><h2 className="section-title">궁금한 게 있으신가요?</h2><p className="section-desc">서비스 도입, 기능 제안, 파트너십 등 편하게 남겨주세요.</p></FadeIn>
          <div className="contact-layout">
            <FadeIn>
              <div className="contact-info">
                {[{ label: "이메일", value: "mnhyuk@velaanalytics.com" }, { label: "운영 시간", value: "평일 10:00 — 18:00" }, { label: "응답 시간", value: "영업일 기준 1일 이내" }].map((c) => (
                  <div key={c.label}><div className="contact-label">{c.label}</div><div className="contact-value">{c.value}</div></div>
                ))}
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
                  <div className="contact-label" style={{ marginBottom: 12 }}>바로 시작하고 싶다면</div>
                  <Link href="/simulator" className="btn-primary" style={{ display: "inline-flex" }}>시뮬레이터 →</Link>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div><label className="field-label">이름</label><input ref={nameRef} className="field-input" type="text" placeholder="홍길동" required /></div>
                  <div><label className="field-label">연락처</label><input className="field-input" type="text" placeholder="010-0000-0000" /></div>
                </div>
                <div><label className="field-label">이메일</label><input ref={emailRef} className="field-input" type="email" placeholder="your@email.com" required /></div>
                <div><label className="field-label">문의 내용</label><textarea ref={messageRef} className="field-input" placeholder="궁금한 점을 자유롭게 적어주세요." required /></div>
                <button ref={submitBtnRef} type="submit" className="form-submit">문의 보내기</button>
                <p ref={formMsgRef} className="form-msg" />
              </form>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo">VELA<span>.</span></div>
              <p style={{fontSize:"13px",color:"var(--gray-400)",marginTop:"12px",lineHeight:"1.8"}}>
                상호명 : 벨라솔루션 | 대표자 : 김민혁<br />
                사업자등록번호 : 777-17-02386<br />
                사업장 주소 : 대전광역시 중구 당디로96번길 9, 204호(유천동)<br />
                이메일 : mnhyuk@velaanalytics.com<br />
                서비스 URL : https://www.velaanalytics.com
              </p>
            </div>
            <div className="footer-links">
              <a href="#features">도구</a>
              <Link href="/simulator">시뮬레이터</Link>
              <Link href="/community">커뮤니티</Link>
              <Link href="/game">게임</Link>
              <a href="#pricing">요금제</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">문의</a>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} VELA. All rights reserved.</div>
            <div className="footer-legal">
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ── 회원 전용 홈화면 ─────────────────────────────────────────
const TOOLS_HOME = [
  { icon:"🧮", label:"원가 계산기",    href:"/tools/menu-cost" },
  { icon:"👥", label:"인건비 스케줄러", href:"/tools/labor" },
  { icon:"🧾", label:"세금 계산기",    href:"/tools/tax" },
  { icon:"📄", label:"손익계산서 PDF", href:"/tools/pl-report" },
  { icon:"✅", label:"창업 체크리스트", href:"/tools/startup-checklist" },
  { icon:"📱", label:"SNS 콘텐츠",     href:"/tools/sns-content" },
  { icon:"💬", label:"리뷰 답변",      href:"/tools/review-reply" },
  { icon:"🗺️", label:"상권 분석",     href:"/tools/area-analysis" },
];
type NewsItem = { title:string; summary:string; source:string; url:string; tag?:string; insight?:string };
import type { User } from "@supabase/supabase-js";

type IndexData = { price:string; date:string } | null;

function StockTicker() {
  const [stocks, setStocks] = useState<{kospi:IndexData;kosdaq:IndexData;usdkrw:IndexData}|null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/home")
      .then(r => r.json())
      .then(d => { if (d.stocks) setStocks(d.stocks); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const cards = [
    { label:"KOSPI",  icon:"📈", data: stocks?.kospi  },
    { label:"KOSDAQ", icon:"📊", data: stocks?.kosdaq },
    { label:"달러/원", icon:"💵", data: stocks?.usdkrw },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({label, icon, data}) => (
        <div key={label} className="rounded-2xl bg-white ring-1 ring-slate-200 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">{icon}</span>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
          </div>
          {!loaded ? (
            <div className="animate-pulse space-y-1">
              <div className="h-5 bg-slate-100 rounded w-20" />
              <div className="h-3 bg-slate-100 rounded w-14" />
            </div>
          ) : data ? (
            <>
              <p className="text-base font-bold text-slate-900">{data.price}</p>
              <p className="text-xs text-slate-400 mt-0.5">{data.date} 전일종가</p>
            </>
          ) : (
            <p className="text-xs text-slate-400 mt-1">—</p>
          )}
        </div>
      ))}
    </div>
  );
}

const NEWS_TAGS = [
  { key: "all", label: "전체", color: "bg-slate-900 text-white" },
  { key: "외식업", label: "🍽️ 외식업", color: "bg-orange-500 text-white" },
  { key: "소상공인", label: "🏪 소상공인", color: "bg-emerald-500 text-white" },
  { key: "경제", label: "📈 경제", color: "bg-blue-500 text-white" },
];
const TAG_COLORS: Record<string, string> = {
  "외식업": "bg-orange-100 text-orange-700",
  "소상공인": "bg-emerald-100 text-emerald-700",
  "경제": "bg-blue-100 text-blue-700",
};

function NewsSection({ news, loading }: { news: NewsItem[]; loading: boolean }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? news : news.filter(n => n.tag === filter);

  return (
    <div className="sm:col-span-2 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">📰 오늘의 뉴스</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">AI 요약</span>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {NEWS_TAGS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filter === t.key ? t.color : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i=><div key={i} className="animate-pulse space-y-1"><div className="h-4 bg-slate-100 rounded w-3/4"/><div className="h-3 bg-slate-100 rounded w-1/2"/></div>)}
          <p className="text-xs text-slate-400 mt-2">오늘 뉴스 불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">해당 카테고리 뉴스가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((n,i)=>(
            <a key={i} href={n.url||"#"} target="_blank" rel="noopener noreferrer"
              className="block rounded-2xl border border-slate-100 p-4 hover:bg-slate-50 hover:border-slate-200 transition group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {n.tag && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[n.tag] ?? "bg-slate-100 text-slate-600"}`}>{n.tag}</span>}
                    <span className="text-[11px] text-slate-400">{n.source}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{n.summary}</p>
                  {n.insight && (
                    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5">
                      <p className="text-xs text-amber-800">💡 <b>사장님 인사이트:</b> {n.insight}</p>
                    </div>
                  )}
                </div>
                <span className="text-xs text-blue-400 group-hover:text-blue-600 flex-shrink-0 mt-1">보기 →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerTips() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDay(); // 0=일 ~ 6=토
  const date = now.getDate();

  // 월별 시즌 팁
  const seasonalTips: Record<number, { title: string; tips: string[] }> = {
    1: { title: "1월 — 신년 시즌", tips: ["연초 메뉴 리뉴얼 시기입니다. 작년 하위 20% 메뉴를 과감히 정리하세요.", "연말정산 시즌, 법인카드 사용 고객이 늘어납니다. 점심 세트 강화하세요.", "난방비가 가장 높은 달입니다. 에어커튼·문풍지로 열손실 20% 줄일 수 있어요."] },
    2: { title: "2월 — 비수기 돌파", tips: ["외식업 비수기입니다. 이 시기에 원가율을 1%만 낮춰도 연간 수백만원 절약됩니다.", "발렌타인데이 특별 메뉴를 2주 전부터 SNS에 노출하세요. 예약제가 객단가를 올립니다.", "비수기에 직원 교육을 집중하세요. 성수기에 서비스 품질이 매출을 결정합니다."] },
    3: { title: "3월 — 봄 시즌 준비", tips: ["봄 메뉴 출시 적기입니다. 제철 식재료(냉이, 달래, 봄나물) 활용하면 원가를 낮출 수 있어요.", "테라스·야외 좌석이 있다면 지금 정비하세요. 4월부터 회전율이 2배 됩니다.", "3월 신학기에 주변 학교·학원가 전단지 배포가 가장 효과적입니다."] },
    4: { title: "4월 — 성수기 진입", tips: ["꽃놀이 시즌, 테이크아웃·도시락 메뉴를 추가하면 객단가 외 추가 매출이 생깁니다.", "4월은 외식 지출이 연중 최고인 달입니다. 신메뉴 출시 골든타임이에요.", "네이버 플레이스 리뷰 관리를 집중하세요. 봄에 검색량이 급증합니다."] },
    5: { title: "5월 — 가정의 달 특수", tips: ["어버이날·어린이날 가족 단체 예약을 2주 전부터 받으세요. 코스 메뉴가 객단가를 50% 올립니다.", "가정의 달 선물세트(상품권, 밀키트)를 만들어보세요. 객단가 대비 마진이 높습니다.", "5월 매출이 연간 BEP 달성 여부를 결정합니다. 이 달 순이익을 꼭 체크하세요."] },
    6: { title: "6월 — 여름 대비", tips: ["장마 시작 전 배달 메뉴를 강화하세요. 비 오는 날 배달 주문이 평소의 1.5배입니다.", "에어컨 점검과 전기료 확인을 지금 하세요. 여름 전기료가 월 50만원 이상 늘어날 수 있습니다.", "냉면·빙수 등 여름 한정 메뉴를 6월 초에 출시하면 SNS 선점 효과가 있습니다."] },
    7: { title: "7월 — 성수기 관리", tips: ["여름 성수기 식자재 관리가 핵심입니다. 냉장고 온도를 매일 체크하고 선입선출 철저히 하세요.", "무더위에 홀 매출이 줄고 배달이 늘어납니다. 배달 전용 메뉴 마진을 재계산하세요.", "파트타이머 채용 시기입니다. 여름 알바를 7월 초에 확보해야 8월에 안정적입니다."] },
    8: { title: "8월 — 휴가 시즌", tips: ["사장님도 쉬어야 합니다. 연중 가장 매출이 낮은 주를 골라 3일이라도 휴가를 내세요.", "8월은 식재료 가격이 연중 최고입니다. 메뉴 가격 조정을 고려할 시기예요.", "여름 한정 메뉴의 재고를 정리하고, 가을 메뉴를 9월 초 출시 목표로 준비하세요."] },
    9: { title: "9월 — 가을 시즌", tips: ["추석 연휴 전 영업 계획을 세우세요. 명절 선물세트가 의외의 매출원이 됩니다.", "가을 제철 식재료(버섯, 고구마, 밤)로 메뉴를 구성하면 원가 절감 + 계절감을 잡을 수 있어요.", "9월부터 점심 매출이 회복됩니다. 직장인 대상 런치 세트를 재정비하세요."] },
    10: { title: "10월 — 4분기 전략", tips: ["연말까지 3개월, 올해 목표 매출 대비 현재 달성률을 체크하세요. VELA 대시보드에서 확인 가능합니다.", "할로윈 이벤트는 카페·바 업종에서 객단가를 30% 올릴 수 있는 기회입니다.", "10월은 연간 식재료비를 재협상하기 좋은 시기입니다. 거래처에 단가 조정을 요청하세요."] },
    11: { title: "11월 — 연말 준비", tips: ["12월 송년회·모임 예약을 11월부터 받으세요. 단체 코스 메뉴를 미리 구성해두면 객단가가 2배입니다.", "연말정산 대비, 올해 비용 지출 내역을 정리하세요. 놓친 경비 처리가 있을 수 있어요.", "겨울 메뉴(국물, 따뜻한 음료) 출시 적기입니다. 11월 중순 출시가 이상적이에요."] },
    12: { title: "12월 — 연말 특수", tips: ["송년회 시즌, 단체 예약 노쇼를 방지하기 위해 예약금 제도를 도입하세요.", "연말 매출이 좋아도 1월 비수기를 대비해 현금을 확보하세요. 매출의 20%는 유보하는 게 안전합니다.", "올해 월별 매출·순이익을 정리하고 내년 목표를 세우세요. VELA 시뮬레이터로 시나리오를 돌려보세요."] },
  };

  // 요일별 팁
  const dailyTips: Record<number, string> = {
    1: "월요일은 보통 매출이 낮은 날입니다. 식재료 발주와 재고 정리에 집중하세요.",
    2: "화요일은 신메뉴 테스트에 적합합니다. 손님이 적을 때 직원들과 시식 평가를 해보세요.",
    3: "수요일 — 주중 중간 매출 회복일입니다. SNS에 주말 이벤트를 미리 올려두세요.",
    4: "목요일부터 주말 식재료를 준비하세요. 금요일 발주는 늦습니다.",
    5: "금요일 저녁은 회전율이 핵심입니다. 예약 손님과 워크인 비율을 체크하세요.",
    6: "토요일은 매출 최고일이지만 식재료 소진도 빠릅니다. 재고를 수시로 확인하세요.",
    0: "일요일은 브런치·가족 단위 손님이 많습니다. 세트 메뉴가 객단가를 올립니다.",
  };

  const season = seasonalTips[month] ?? seasonalTips[4];
  const tipIndex = date % season.tips.length;

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900">💡 사장님 실전 경영 팁</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{season.title}</span>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">이번 달 핵심</p>
          <p className="text-sm text-blue-900 leading-relaxed">{season.tips[tipIndex]}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">오늘의 할 일</p>
          <p className="text-sm text-slate-700 leading-relaxed">{dailyTips[day]}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-600 mb-1">원가 절감 팁</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            {month <= 2 || month >= 11
              ? "겨울철 가스비가 급등합니다. 조리 효율을 높이려면 뚜껑 사용, 예열 시간 단축, 동시 조리를 습관화하세요."
              : month <= 5
              ? "봄 제철 식재료를 적극 활용하세요. 제철 재료는 맛도 좋고 원가도 30% 이상 저렴합니다."
              : month <= 8
              ? "여름철 식재료 폐기율이 높아집니다. 발주 주기를 주 2→3회로 늘리면 폐기를 절반으로 줄일 수 있어요."
              : "가을 제철 재료(버섯, 고구마, 밤)로 메뉴를 구성하면 원가를 낮추면서 계절감을 줄 수 있습니다."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MemberHome() {
  const [user,      setUser]      = useState<User|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [news,      setNews]      = useState<NewsItem[]>([]);
  const [newsLoad,  setNewsLoad]  = useState(true);
  const [thisSnap,  setThisSnap]  = useState<{total_sales:number;net_profit:number;month:string}|null|undefined>(undefined);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data }: { data: { user: User|null } }) => {
      setUser(data.user);
      if (data.user) {
        const m = new Date().toISOString().slice(0,7);
        const { data: snap } = await sb.from("monthly_snapshots")
          .select("total_sales,net_profit,month").eq("user_id", data.user.id).eq("month", m).maybeSingle();
        setThisSnap(snap ?? null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/home")
      .then(r => r.json())
      .then(d => { if (d.news) setNews(d.news); })
      .catch(() => setNews([
        { title:"최저임금 인상 논의 본격화", summary:"2027년 최저임금 심의 시작", source:"연합뉴스", url:"https://www.yna.co.kr" },
        { title:"배달앱 수수료 인하 논의", summary:"소상공인 부담 완화 추진", source:"한국경제", url:"https://www.hankyung.com" },
        { title:"외식물가 상승세 지속", summary:"식재료비·인건비 동반 상승", source:"머니투데이", url:"https://www.mt.co.kr" },
      ]))
      .finally(() => setNewsLoad(false));
  }, []);

  const name = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사장님";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "오늘도 수고하셨어요";
  const fmtN = (n: number) => Math.round(n).toLocaleString("ko-KR");

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <OnboardingModal />

      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl space-y-5">

          {/* 인사말 */}
          <div>
            <p className="text-sm text-slate-400">{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{greeting}, {name}님! 👋</h1>
          </div>

          {/* 가입 환영 배너 (첫 방문 시) */}
          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("signup") === "success" && (
            <div className="rounded-2xl bg-blue-600 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-white font-bold text-sm">환영합니다! VELA에 가입되었어요.</p>
                <p className="text-blue-200 text-xs mt-0.5">시뮬레이터로 내 매장을 분석해보세요. 3분이면 충분합니다.</p>
              </div>
              <Link href="/simulator" className="ml-auto flex-shrink-0 rounded-xl bg-white text-blue-600 text-xs font-bold px-4 py-2">시작하기 →</Link>
            </div>
          )}

          {/* 이벤트 배너 */}
          <EventBanner />

          {/* 빠른 실행 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {icon:"📊",label:"시뮬레이터",sub:"수익 분석하기",  href:"/simulator",bg:"bg-slate-900",text:"text-white",subText:"text-slate-400"},
              {icon:"🛠️",label:"도구 모음", sub:"원가·세금·인건비",href:"/tools",   bg:"bg-blue-600", text:"text-white",subText:"text-blue-200"},
              {icon:"📈",label:"대시보드",  sub:"매출 현황 보기", href:"/dashboard",bg:"bg-white",    text:"text-slate-900",subText:"text-slate-400"},
              {icon:"👥",label:"커뮤니티",  sub:"사장님들과 소통",href:"/community",bg:"bg-white",    text:"text-slate-900",subText:"text-slate-400"},
            ].map(b=>(
              <Link key={b.href} href={b.href}
                className={`${b.bg} ${b.text} rounded-2xl p-4 sm:p-5 ring-1 ring-slate-200 hover:opacity-90 transition block`}>
                <p className="text-2xl mb-2">{b.icon}</p>
                <p className="text-sm font-bold">{b.label}</p>
                <p className={`text-xs mt-0.5 ${b.subText} hidden sm:block`}>{b.sub}</p>
              </Link>
            ))}
          </div>

          {/* 지수 티커 */}
          <StockTicker />

          {/* 월초 매출 등록 리마인더 */}
          {thisSnap === null && <MonthlyReminder />}

          {/* 이번달 매출 알림 — MonthlyReminder에서 이미 표시하므로 중복 제거 */}
          {thisSnap && (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <p className="text-xs text-slate-400">{thisSnap.month} 매출 현황</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    매출 <span className="text-blue-600">{fmtN(thisSnap.total_sales)}원</span>
                    <span className="text-slate-300 mx-2">·</span>
                    순이익 <span className={thisSnap.net_profit>=0?"text-emerald-600":"text-red-500"}>{thisSnap.net_profit>=0?"+":""}{fmtN(thisSnap.net_profit)}원</span>
                  </p>
                </div>
              </div>
              <Link href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">상세보기 →</Link>
            </div>
          )}

          {/* 사장님 실전 경영 팁 */}
          <OwnerTips />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 뉴스 */}
            <NewsSection news={news} loading={newsLoad} />
            {/* 도구 */}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h2 className="text-base font-bold text-slate-900 mb-4">🛠️ 도구</h2>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS_HOME.map(t=>(
                  <Link key={t.href} href={t.href}
                    className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 p-2.5 hover:bg-slate-100 transition text-center">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-xs font-medium text-slate-700 leading-tight">{t.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// ── 라우터 ────────────────────────────────────────────────────
export default function HomePage() {
  // Supabase 세션 localStorage에서 즉시 읽기 → 깜빡임 없음
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Supabase는 sb-{ref}-auth-token 키로 세션 저장
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (sbKey) {
      try { return !!JSON.parse(localStorage.getItem(sbKey) ?? "null"); } catch { return false; }
    }
    return localStorage.getItem("vela-logged-in") === "1";
  });

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
      const val = !!data.user;
      setLoggedIn(val);
      localStorage.setItem("vela-logged-in", val ? "1" : "0");
    });
  }, []);

  // 해시 앵커(#features 등) 접근 시 랜딩페이지 표시
  const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;
  return (
    <>
      <EventPopup />
      {hasHash ? <LandingContent /> : loggedIn ? <MemberHome /> : <LandingContent />}
    </>
  );
}
