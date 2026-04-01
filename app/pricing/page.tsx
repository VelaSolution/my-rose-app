"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const PLANS = [
  {
    id: "free", name: "무료", price: 0, unit: "원/월",
    desc: "혼자 운영하는 소규모 매장에 적합",
    color: "#6B7684",
    features: [
      { text: "수익 시뮬레이터 (무제한)", included: true },
      { text: "월 3회 AI 브리핑", included: true },
      { text: "기본 차트 및 분석", included: true },
      { text: "링크 공유", included: true },
      { text: "AI 전략 추천", included: false },
      { text: "POS 파일 분석", included: false },
      { text: "히스토리 12개월", included: false },
      { text: "팀 멤버 초대", included: false },
    ],
  },
  {
    id: "standard", name: "스탠다드", price: 9900, unit: "원/월",
    desc: "성장하는 매장을 위한 핵심 기능 모음",
    color: "#3182F6",
    popular: true,
    features: [
      { text: "수익 시뮬레이터 (무제한)", included: true },
      { text: "무제한 AI 브리핑", included: true },
      { text: "기본 차트 및 분석", included: true },
      { text: "링크 공유", included: true },
      { text: "AI 전략 추천 (무제한)", included: true },
      { text: "POS 파일 분석", included: true },
      { text: "히스토리 12개월", included: true },
      { text: "팀 멤버 초대", included: false },
    ],
  },
  {
    id: "pro", name: "프로", price: 29900, unit: "원/월",
    desc: "다점포·프랜차이즈 운영자를 위한 플랜",
    color: "#6366F1",
    features: [
      { text: "수익 시뮬레이터 (무제한)", included: true },
      { text: "무제한 AI 브리핑", included: true },
      { text: "기본 차트 및 분석", included: true },
      { text: "링크 공유", included: true },
      { text: "AI 전략 추천 (무제한)", included: true },
      { text: "POS 파일 분석", included: true },
      { text: "히스토리 무제한", included: true },
      { text: "팀 멤버 초대 (무제한)", included: true },
    ],
  },
];

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean|null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setIsLoggedIn(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  function handleSelect(plan: typeof PLANS[0]) {
    if (plan.id === "free") { window.location.href = isLoggedIn ? "/simulator" : "/signup"; return; }
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    setSelectedPlan(plan);
    setShowModal(true);
  }

  async function handlePayment() {
    if (!selectedPlan || !userId) return;
    setPayLoading(true);
    try {
      // 토스페이먼츠 SDK CDN 동적 로드
      if (!(window as any).TossPayments) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.tosspayments.com/v2/standard";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("토스페이먼츠 SDK 로드 실패"));
          document.head.appendChild(script);
        });
      }

      const toss = (window as any).TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: userId });

      const orderId = `VELA-${selectedPlan.id}-${Date.now()}`;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: selectedPlan.price },
        orderId,
        orderName: `VELA ${selectedPlan.name} 플랜`,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: undefined,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "결제 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Pretendard',-apple-system,sans-serif;background:#F9FAFB;color:#191F28;line-height:1.6}
        .pricing-page{min-height:100vh;padding:120px 24px 80px}
        .pricing-inner{max-width:1000px;margin:0 auto}
        .pricing-header{text-align:center;margin-bottom:60px}
        .pricing-tag{display:inline-block;background:#EBF3FF;color:#3182F6;font-size:13px;font-weight:600;padding:5px 14px;border-radius:100px;margin-bottom:16px}
        .pricing-title{font-size:clamp(32px,4vw,52px);font-weight:800;letter-spacing:-0.02em;color:#191F28;margin-bottom:12px}
        .pricing-subtitle{font-size:17px;color:#6B7684}
        .plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .plan-card{background:#fff;border:2px solid #E5E8EB;border-radius:24px;padding:36px 28px;position:relative;transition:border-color .2s,transform .2s}
        .plan-card:hover{transform:translateY(-4px)}
        .plan-card.popular{border-color:#3182F6}
        .popular-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#3182F6;color:#fff;font-size:12px;font-weight:700;padding:5px 16px;border-radius:100px;white-space:nowrap}
        .plan-name{font-size:14px;font-weight:600;color:#6B7684;margin-bottom:8px}
        .plan-price{font-size:40px;font-weight:800;color:#191F28;letter-spacing:-0.02em;line-height:1}
        .plan-price span{font-size:16px;font-weight:500;color:#9EA6B3}
        .plan-desc{font-size:14px;color:#6B7684;margin:12px 0 24px;line-height:1.6}
        .plan-btn{width:100%;padding:14px;border-radius:12px;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:'Pretendard',sans-serif;transition:all .15s;margin-bottom:28px}
        .plan-btn-blue{background:#3182F6;color:#fff}
        .plan-btn-blue:hover{background:#1B64DA}
        .plan-btn-gray{background:#F2F4F6;color:#333D4B}
        .plan-btn-gray:hover{background:#E5E8EB}
        .plan-btn-indigo{background:#6366F1;color:#fff}
        .plan-btn-indigo:hover{background:#4F46E5}
        .plan-features{list-style:none}
        .plan-feature{display:flex;align-items:center;gap:10px;font-size:14px;padding:10px 0;border-top:1px solid #F2F4F6;color:#333D4B}
        .plan-feature.disabled{color:#9EA6B3}
        .feature-check{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:700}
        .check-yes{background:#ECFDF5;color:#059669}
        .check-no{background:#F2F4F6;color:#9EA6B3}
        .faq-section{margin-top:80px}
        .faq-title{font-size:28px;font-weight:800;color:#191F28;margin-bottom:32px;text-align:center;letter-spacing:-0.02em}
        .faq-list{display:flex;flex-direction:column;gap:12px;max-width:700px;margin:0 auto}
        .faq-item{background:#fff;border:1px solid #E5E8EB;border-radius:16px;padding:20px 24px}
        .faq-q{font-size:15px;font-weight:600;color:#191F28;margin-bottom:8px}
        .faq-a{font-size:14px;color:#6B7684;line-height:1.7}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px}
        .modal{background:#fff;border-radius:24px;padding:40px;max-width:440px;width:100%;position:relative}
        .modal-close{position:absolute;top:20px;right:20px;background:none;border:none;font-size:20px;cursor:pointer;color:#9EA6B3;line-height:1}
        .modal-title{font-size:22px;font-weight:800;color:#191F28;margin-bottom:8px;letter-spacing:-0.02em}
        .modal-desc{font-size:14px;color:#6B7684;margin-bottom:28px}
        .modal-plan-info{background:#F9FAFB;border-radius:16px;padding:20px;margin-bottom:24px}
        .modal-plan-name{font-size:13px;font-weight:600;color:#6B7684;margin-bottom:4px}
        .modal-plan-price{font-size:32px;font-weight:800;color:#191F28;letter-spacing:-0.02em}
        .modal-plan-price span{font-size:15px;font-weight:500;color:#9EA6B3}
        .modal-notice{background:#EBF3FF;border-radius:12px;padding:16px;font-size:13px;color:#3182F6;line-height:1.6;margin-bottom:24px}
        .modal-btn{width:100%;padding:16px;border-radius:12px;font-size:16px;font-weight:700;border:none;cursor:pointer;font-family:'Pretendard',sans-serif;background:#3182F6;color:#fff;transition:background .15s}
        .modal-btn:hover{background:#1B64DA}
        @media(max-width:768px){.plans-grid{grid-template-columns:1fr}}
      `}</style>

      <NavBar />

      {showModal && selectedPlan && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-title">결제하기</div>
            <div className="modal-desc">선택하신 플랜 정보를 확인해주세요.</div>
            <div className="modal-plan-info">
              <div className="modal-plan-name">{selectedPlan.name} 플랜</div>
              <div className="modal-plan-price">
                {selectedPlan.price.toLocaleString("ko-KR")}<span>원/월</span>
              </div>
            </div>
            <div className="modal-notice">
              💳 토스페이먼츠로 안전하게 결제됩니다.<br />
              언제든지 마이페이지에서 해지할 수 있습니다.
            </div>
            <button
              className="modal-btn"
              onClick={handlePayment}
              disabled={payLoading}
              style={{ opacity: payLoading ? 0.7 : 1 }}
            >
              {payLoading ? "결제 창 열는 중..." : `${selectedPlan.price.toLocaleString("ko-KR")}원 결제하기`}
            </button>
          </div>
        </div>
      )}

      <div className="pricing-page">
        <div className="pricing-inner">
          <div className="pricing-header">
            <span className="pricing-tag">요금제</span>
            <h1 className="pricing-title">합리적인 가격으로<br />시작하세요</h1>
            <p className="pricing-subtitle">매장 규모에 맞는 플랜을 선택하세요. 언제든 변경 가능합니다.</p>
          </div>

          <div className="plans-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`plan-card${plan.popular ? " popular" : ""}`}>
                {plan.popular && <div className="popular-badge">가장 인기</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">
                  {plan.price === 0 ? "무료" : plan.price.toLocaleString("ko-KR")}
                  {plan.price > 0 && <span>원/월</span>}
                </div>
                <div className="plan-desc">{plan.desc}</div>
                <button
                  className={`plan-btn ${plan.id === "standard" ? "plan-btn-blue" : plan.id === "pro" ? "plan-btn-indigo" : "plan-btn-gray"}`}
                  onClick={() => handleSelect(plan)}
                >
                  {plan.id === "free" ? "무료로 시작" : plan.id === "standard" ? "스탠다드 시작" : "프로 시작"}
                </button>
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`plan-feature${f.included ? "" : " disabled"}`}>
                      <span className={`feature-check ${f.included ? "check-yes" : "check-no"}`}>
                        {f.included ? "✓" : "−"}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="faq-section">
            <div className="faq-title">자주 묻는 질문</div>
            <div className="faq-list">
              {[
                { q: "무료 플랜에서 유료로 전환하면 데이터가 유지되나요?", a: "네, 기존에 저장한 시뮬레이션 데이터는 모두 유지됩니다. 플랜 변경 후 추가 기능이 즉시 활성화됩니다." },
                { q: "언제든지 구독을 취소할 수 있나요?", a: "네, 구독은 언제든 취소 가능합니다. 취소 후에도 결제된 기간 동안은 유료 기능을 계속 사용하실 수 있습니다." },
                { q: "결제는 어떤 방법으로 가능한가요?", a: "신용카드, 체크카드, 카카오페이, 네이버페이 등 다양한 결제 방법을 지원할 예정입니다. (결제 시스템 준비 중)" },
                { q: "세금계산서 발행이 가능한가요?", a: "사업자 회원의 경우 세금계산서 발행이 가능합니다. 결제 시스템 오픈 후 마이페이지에서 신청하실 수 있습니다." },
                { q: "팀 플랜은 어떻게 사용하나요?", a: "프로 플랜에서 팀 멤버를 초대하면 같은 매장 데이터를 공유하며 함께 분석할 수 있습니다. 초대받은 멤버는 별도 요금이 없습니다." },
              ].map((faq) => (
                <div key={faq.q} className="faq-item">
                  <div className="faq-q">Q. {faq.q}</div>
                  <div className="faq-a">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
