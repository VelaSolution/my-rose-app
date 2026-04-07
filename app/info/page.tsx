"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { PLANS } from "@/lib/plans";

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

export default function InfoPage() {
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
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--blue:#3182F6;--blue-dark:#1B64DA;--blue-light:#EBF3FF;--gray-50:#F9FAFB;--gray-100:#F2F4F6;--gray-200:#E5E8EB;--gray-400:#9EA6B3;--gray-600:#6B7684;--gray-800:#333D4B;--gray-900:#191F28}
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .fade-init{opacity:0;animation:fadeUp .6s ease forwards}
        .d1{animation-delay:.1s}.d2{animation-delay:.25s}.d3{animation-delay:.4s}.d4{animation-delay:.55s}
        .hero{min-height:100vh;display:flex;align-items:center;padding:120px 24px 80px;position:relative;overflow:hidden}
        .hero-bg{position:absolute;top:-200px;right:-200px;width:800px;height:800px;background:radial-gradient(ellipse,#EBF3FF 0%,transparent 70%);pointer-events:none}
        .hero-bg2{position:absolute;bottom:-100px;left:-100px;width:500px;height:500px;background:radial-gradient(ellipse,#F0F4FF 0%,transparent 70%);pointer-events:none}
        .hero-inner{max-width:1100px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1}
        .hero-tag{display:inline-flex;align-items:center;gap:8px;background:var(--blue-light);color:var(--blue);font-size:13px;font-weight:600;padding:6px 14px;border-radius:100px;margin-bottom:24px}
        .hero-tag-dot{width:6px;height:6px;background:var(--blue);border-radius:50%}
        .hero-title{font-size:clamp(36px,4.5vw,58px);font-weight:800;line-height:1.15;color:var(--gray-900);margin-bottom:20px;letter-spacing:-0.02em}
        .hero-title span{color:var(--blue)}
        .hero-desc{font-size:18px;color:var(--gray-600);line-height:1.7;margin-bottom:40px}
        .hero-actions{display:flex;gap:12px;flex-wrap:wrap}
        .btn-primary{background:var(--blue);color:#fff;padding:16px 28px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;transition:background .15s,transform .15s;display:inline-flex;align-items:center;gap:8px}
        .btn-primary:hover{background:var(--blue-dark);transform:translateY(-1px)}
        .btn-secondary{background:var(--gray-100);color:var(--gray-800);padding:16px 28px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;transition:background .15s;display:inline-flex;align-items:center;gap:8px}
        .btn-secondary:hover{background:var(--gray-200)}
        .hero-stats{display:flex;gap:32px;margin-top:48px;padding-top:40px;border-top:1px solid var(--gray-200)}
        .stat-num{font-size:28px;font-weight:800;color:var(--gray-900);letter-spacing:-0.02em}
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
        .section-title{font-size:clamp(28px,3.5vw,44px);font-weight:800;letter-spacing:-0.02em;color:var(--gray-900);margin-bottom:16px;line-height:1.2}
        .section-desc{font-size:17px;color:var(--gray-600);line-height:1.7;max-width:500px}
        .features-bg{background:var(--gray-50)}
        .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}
        .feature-card{background:#fff;border-radius:20px;padding:32px;border:1px solid var(--gray-200);transition:transform .2s,box-shadow .2s}
        .feature-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.08)}
        .feature-icon{width:48px;height:48px;border-radius:14px;background:var(--blue-light);display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
        .feature-title{font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:10px}
        .feature-desc{font-size:14px;color:var(--gray-600);line-height:1.7}
        .feature-tag{display:inline-block;margin-top:16px;font-size:12px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:4px 10px;border-radius:100px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px;text-align:center}
        .step-num{width:56px;height:56px;background:var(--blue);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin:0 auto 20px}
        .step-title{font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:8px}
        .step-desc{font-size:14px;color:var(--gray-600);line-height:1.7}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}
        .pricing-card{background:#fff;border:2px solid var(--gray-200);border-radius:24px;padding:36px 32px;position:relative;transition:border-color .2s}
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

      {/* FEATURES */}
      <section id="features" className="features-bg">
        <div className="section-inner">
          <FadeIn><span className="section-tag">도구</span><h2 className="section-title">사업에 필요한 모든 도구</h2><p className="section-desc">외식업 사장님을 위한 실무 도구 모음. 계산부터 콘텐츠 생성까지 한 곳에서.</p></FadeIn>
          <div className="features-grid">
            {[
              { icon:"🧮", title:"메뉴별 원가 계산기",  desc:"식재료 원가 입력 → 원가율·건당 순익 자동 계산. 메뉴 가격 결정에 바로 활용하세요.",      tag:"원가 계산",  href:"/tools/menu-cost" },
              { icon:"👥", title:"인건비 스케줄러",      desc:"직원별 시급·근무시간 설정 → 주간·월간 인건비 예측. 알바 채용 계획에 필수.",              tag:"인건비 관리", href:"/tools/labor" },
              { icon:"🧾", title:"세금 계산기",          desc:"매출 기반 부가세·종합소득세 예상액 자동 산출. 세금 폭탄 없이 미리 준비하세요.",           tag:"세금 예측",  href:"/tools/tax" },
              { icon:"📄", title:"손익계산서 PDF",       desc:"시뮬레이션 데이터로 월별 P&L 리포트 PDF 출력. 투자자·세무사에게 바로 공유 가능.",        tag:"PDF 출력",   href:"/tools/pl-report" },
              { icon:"✅", title:"창업 체크리스트",      desc:"업종별 인허가·준비물·타임라인 단계별 가이드. 창업 전 놓치는 것 없이 준비하세요.",         tag:"창업 준비",  href:"/tools/startup-checklist" },
              { icon:"📱", title:"SNS 콘텐츠 생성기",   desc:"메뉴·이벤트 정보 입력 → 인스타 캡션 AI 자동 생성. 매일 고민하는 SNS 포스팅 해결.",     tag:"AI · SNS",   href:"/tools/sns-content" },
              { icon:"💬", title:"리뷰 답변 생성기",     desc:"고객 리뷰 붙여넣기 → AI가 맞춤 답변 초안 작성. 악성 리뷰도 프로답게 대응하세요.",        tag:"AI · 리뷰",  href:"/tools/review-reply" },
              { icon:"🗺️", title:"상권 분석 도우미",    desc:"입지 조건 입력 → AI 상권 적합도 평가 리포트. 창업 전 상권 리스크를 미리 파악하세요.",    tag:"AI · 상권",  href:"/tools/area-analysis" },
              { icon:"📝", title:"사업계획서 도우미",   desc:"6단계 사업계획서 작성 + 미리보기 + 복사. 투자용·지원금용 모두 대응.",                      tag:"창업 · NEW", href:"/tools/business-plan" },
              { icon:"🏛️", title:"정부 지원사업 매칭",  desc:"내 조건에 맞는 정부 지원금·대출·보증 프로그램을 자동으로 매칭합니다.",                      tag:"창업 · NEW", href:"/tools/gov-support" },
              { icon:"📈", title:"재무 시뮬레이션",     desc:"런웨이·BEP·12개월 현금흐름을 3가지 시나리오로 시뮬레이션합니다.",                          tag:"창업 · NEW", href:"/tools/financial-sim" },
              { icon:"🧾", title:"세무·회계 가이드",    desc:"세금 캘린더 + 부가세·소득세·4대보험 계산기 + 절세 전략.",                                  tag:"세무 · NEW", href:"/tools/tax-guide" },
              { icon:"👥", title:"인력 채용 도구",      desc:"급여 계산기 + 근로계약서 생성 + 채용공고 템플릿 3종.",                                     tag:"인사 · NEW", href:"/tools/hiring" },
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
          <FadeIn><div style={{ textAlign: "center" }}><span className="section-tag">사용 방법</span><h2 className="section-title" style={{ textAlign: "center" }}>3단계로 끝납니다</h2></div></FadeIn>
          <div className="steps-grid">
            {[
              { num: "1", title: "정보 입력", desc: "업종·좌석·객단가·비용 구조를 3단계로 간단하게 입력합니다. POS 파일이 있으면 바로 업로드해도 됩니다.", delay: 0 },
              { num: "2", title: "AI 분석", desc: "입력 즉시 20개 이상의 재무 지표가 계산되고 AI가 현재 상태를 진단합니다.", delay: 100 },
              { num: "3", title: "전략 실행", desc: "AI 추천 전략을 확인하고 채팅으로 추가 질문하며 바로 실행 계획을 세웁니다.", delay: 200 },
            ].map((s) => (
              <FadeIn key={s.num} delay={s.delay}>
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="features-bg">
        <div className="section-inner">
          <FadeIn><span className="section-tag">요금제</span><h2 className="section-title">합리적인 가격으로</h2><p className="section-desc">매장 규모에 맞는 플랜을 선택하세요.</p></FadeIn>
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
          <FadeIn><span className="section-tag" style={{ background: "rgba(255,255,255,.1)", color: "#93C5FD" }}>후기</span><h2 className="section-title">실제 사장님들의 이야기</h2></FadeIn>
          <div className="testi-grid">
            {[
              { text: "손익분기점을 처음으로 제대로 이해했어요. 숫자를 보니 어디서 돈이 새는지 바로 보이더라고요.", name: "김○○", role: "카페 운영 3년차", av: "김", delay: 0 },
              { text: "AI가 배달 채널 추가를 추천해줬는데, 실행 후 월 매출이 20% 올랐습니다. 믿기 어렵지만 사실이에요.", name: "박○○", role: "분식점 사장님", av: "박", delay: 80 },
              { text: "창업 전에 미리 수치를 검토할 수 있어서 보증금 협상도 자신 있게 했습니다.", name: "이○○", role: "파인다이닝 예비 창업자", av: "이", delay: 160 },
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

      {/* GAME BANNER */}
      <section style={{background:"linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)", padding:"80px 24px"}}>
        <div className="section-inner" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center"}}>
          <FadeIn>
            <span className="section-tag" style={{background:"rgba(49,130,246,0.2)",color:"#60a5fa"}}>NEW</span>
            <h2 style={{fontSize:"clamp(28px,3.5vw,44px)",fontWeight:800,color:"#fff",letterSpacing:"-0.02em",margin:"12px 0 16px",lineHeight:1.2}}>
              경영 시뮬레이션 게임<br />
              <span style={{color:"#3182F6"}}>직접 운영해보세요</span>
            </h2>
            <p style={{fontSize:17,color:"#94a3b8",lineHeight:1.7,marginBottom:32}}>
              90일 동안 내 가게를 운영하며 날씨·이벤트·직원 관리까지 경험하세요.
              카페, 음식점, 고깃집 등 5가지 업종으로 진짜 사장님 감각을 키워보세요.
            </p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <Link href="/game" style={{display:"inline-flex",alignItems:"center",gap:8,background:"#3182F6",color:"#fff",padding:"14px 28px",borderRadius:12,fontSize:16,fontWeight:700,textDecoration:"none"}}>
                🎮 게임 시작하기 →
              </Link>
              <Link href="/simulator" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",color:"#fff",padding:"14px 28px",borderRadius:12,fontSize:16,fontWeight:600,textDecoration:"none",border:"1px solid rgba(255,255,255,0.2)"}}>
                📊 시뮬레이터
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:24,padding:28,border:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                {[
                  {icon:"☕",label:"카페",sub:"객단가 7천원"},
                  {icon:"🥩",label:"고깃집",sub:"객단가 4.5만원"},
                  {icon:"🍽️",label:"음식점",sub:"객단가 2.2만원"},
                  {icon:"✨",label:"파인다이닝",sub:"객단가 9만원"},
                ].map(item=>(
                  <div key={item.label} style={{background:"rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px",border:"1px solid rgba(255,255,255,0.08)"}}>
                    <div style={{fontSize:24,marginBottom:6}}>{item.icon}</div>
                    <p style={{fontSize:14,fontWeight:700,color:"#fff",margin:"0 0 2px"}}>{item.label}</p>
                    <p style={{fontSize:12,color:"#64748b",margin:0}}>{item.sub}</p>
                  </div>
                ))}
              </div>
              <div style={{background:"rgba(49,130,246,0.15)",borderRadius:12,padding:"12px 16px",border:"1px solid rgba(49,130,246,0.3)",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🏆</span>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:"#60a5fa",margin:0}}>글로벌 랭킹 시스템</p>
                  <p style={{fontSize:12,color:"#475569",margin:0}}>90일 최고 순이익으로 전 세계 사장님들과 경쟁!</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
        <style>{`@media(max-width:768px){.game-banner-grid{grid-template-columns:1fr !important}}`}</style>
      </section>

      {/* CTA */}
      <section className="cta-bg">
        <div className="section-inner">
          <FadeIn>
            <h2 className="cta-title">지금 바로 내 매장을 분석해보세요</h2>
            <p className="cta-desc">회원가입 후 무료로 시작할 수 있습니다. 신용카드 불필요.</p>
            <Link href="/signup" className="btn-white">무료로 시작하기 →</Link>
          </FadeIn>
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
