"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const INDUSTRIES = ["한식", "카페", "양식", "일식", "중식", "분식", "치킨/피자", "주점", "베이커리", "기타"];
const EXPERIENCES = ["예비 창업자", "1년 미만", "1~3년", "3~5년", "5년 이상"];
const FEATURES = [
  "수익 시뮬레이터",
  "AI 브리핑",
  "AI 전략 추천",
  "메뉴 원가 계산기",
  "대시보드",
  "커뮤니티",
  "손익계산서 PDF",
  "기타 도구",
];

export default function EventFeedbackPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [simUsed, setSimUsed] = useState(false);

  // 폼 상태
  const [nickname, setNickname] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [review, setReview] = useState("");
  const [usefulFeatures, setUsefulFeatures] = useState<string[]>([]);
  const [improvement, setImprovement] = useState("");
  const [payIntent, setPayIntent] = useState(3);
  const [phone, setPhone] = useState("");
  const [recommendCount, setRecommendCount] = useState("");
  const [wantedFeature, setWantedFeature] = useState("");
  const [testimonial, setTestimonial] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      setUser(u as any);

      if (u) {
        const { count } = await supabase
          .from("simulation_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id);
        setSimUsed((count ?? 0) > 0);
      }
      setLoading(false);
    }
    init();
  }, []);

  function toggleFeature(f: string) {
    setUsefulFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nickname.trim()) { setError("닉네임 또는 매장명을 입력해주세요."); return; }
    if (!industry) { setError("업종을 선택해주세요."); return; }
    if (!experience) { setError("운영 기간을 선택해주세요."); return; }
    if (review.trim().length < 50) { setError("사용 소감을 50자 이상 작성해주세요."); return; }
    if (usefulFeatures.length === 0) { setError("유용했던 기능을 1개 이상 선택해주세요."); return; }
    if (!improvement.trim()) { setError("개선이 필요한 점을 작성해주세요."); return; }
    if (!phone.trim()) { setError("연락처를 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/event/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          nickname: nickname.trim(),
          industry,
          experience,
          review: review.trim(),
          useful_features: usefulFeatures,
          improvement: improvement.trim(),
          pay_intent: payIntent,
          phone: phone.trim(),
          recommend_count: recommendCount,
          wanted_feature: wantedFeature.trim(),
          testimonial: testimonial.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "제출 실패");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <p style={{ color: "#6B7684" }}>로딩 중...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <>
        <style>{baseStyle}</style>
        <div className="fb-page">
          <div className="fb-inner">
            <div className="fb-success">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#191F28", marginBottom: 12 }}>
                피드백 감사합니다!
              </h1>
              <p style={{ fontSize: 16, color: "#6B7684", lineHeight: 1.7, marginBottom: 8 }}>
                스탠다드 플랜이 <b>1개월 무료</b>로 활성화되었습니다.
              </p>
              <p style={{ fontSize: 14, color: "#9EA6B3", marginBottom: 32 }}>
                AI 브리핑, 대시보드, PDF 출력 등 모든 기능을 체험해보세요!<br />
                추첨을 통해 10분께 스타벅스 기프티콘도 드립니다.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard" className="fb-btn fb-btn-blue">대시보드 바로가기</Link>
                <Link href="/simulator" className="fb-btn fb-btn-gray">시뮬레이터 사용하기</Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{baseStyle}</style>
      <div className="fb-page">
        <div className="fb-inner">
          {/* 헤더 */}
          <div className="fb-header">
            <span className="fb-tag">오픈 체험단 이벤트</span>
            <h1 className="fb-title">VELA를 써보신 소감을 들려주세요!</h1>
            <p className="fb-subtitle">
              피드백을 남겨주신 <b>모든 분께 스탠다드 플랜 1개월 무료</b> 체험을 드리고,<br />
              추첨을 통해 <b>10분께 스타벅스 기프티콘</b>을 드립니다.
            </p>
          </div>

          {!user && (
            <div className="fb-login-notice">
              <p>로그인 후 참여하시면 스탠다드 플랜이 자동으로 활성화됩니다.</p>
              <Link href="/login" className="fb-btn fb-btn-blue" style={{ display: "inline-block", marginTop: 12 }}>
                로그인하기
              </Link>
            </div>
          )}

          {user && !simUsed && (
            <div className="fb-login-notice" style={{ background: "#FFF3E0", borderColor: "#FFB74D" }}>
              <p>수익 시뮬레이터를 <b>1회 이상 사용</b>해야 참여할 수 있습니다.</p>
              <Link href="/simulator" className="fb-btn fb-btn-blue" style={{ display: "inline-block", marginTop: 12 }}>
                시뮬레이터 사용하러 가기
              </Link>
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="fb-form">
            {/* 닉네임 */}
            <div className="fb-field">
              <label className="fb-label">닉네임 또는 매장명 <span className="fb-req">*</span></label>
              <input
                type="text"
                className="fb-input"
                placeholder="예: 을지로 맛집 사장"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* 업종 */}
            <div className="fb-field">
              <label className="fb-label">업종 <span className="fb-req">*</span></label>
              <div className="fb-chips">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    className={`fb-chip${industry === ind ? " active" : ""}`}
                    onClick={() => setIndustry(ind)}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* 운영 기간 */}
            <div className="fb-field">
              <label className="fb-label">운영 기간 <span className="fb-req">*</span></label>
              <div className="fb-chips">
                {EXPERIENCES.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    className={`fb-chip${experience === exp ? " active" : ""}`}
                    onClick={() => setExperience(exp)}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {/* 사용 소감 */}
            <div className="fb-field">
              <label className="fb-label">
                시뮬레이터 사용 소감 <span className="fb-req">*</span>
                <span className="fb-char-count">{review.length}/50자 이상</span>
              </label>
              <textarea
                className="fb-textarea"
                placeholder="어떤 점이 좋았나요? 어떤 상황에서 사용하셨나요? 자유롭게 적어주세요."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
              />
            </div>

            {/* 유용한 기능 */}
            <div className="fb-field">
              <label className="fb-label">가장 유용했던 기능 (복수 선택) <span className="fb-req">*</span></label>
              <div className="fb-chips">
                {FEATURES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`fb-chip${usefulFeatures.includes(f) ? " active" : ""}`}
                    onClick={() => toggleFeature(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* 개선점 */}
            <div className="fb-field">
              <label className="fb-label">개선이 필요한 점 <span className="fb-req">*</span></label>
              <textarea
                className="fb-textarea"
                placeholder="불편했던 점, 추가되면 좋겠는 기능, 이해하기 어려웠던 부분 등"
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                rows={3}
              />
            </div>

            {/* 결제 의향 */}
            <div className="fb-field">
              <label className="fb-label">유료 플랜(월 9,900원) 결제 의향 <span className="fb-req">*</span></label>
              <div className="fb-scale">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`fb-scale-btn${payIntent === n ? " active" : ""}`}
                    onClick={() => setPayIntent(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="fb-scale-labels">
                <span>1: 전혀 없다</span>
                <span>5: 바로 결제하겠다</span>
              </div>
            </div>

            {/* 연락처 */}
            <div className="fb-field">
              <label className="fb-label">연락처 (휴대폰 번호) <span className="fb-req">*</span></label>
              <input
                type="tel"
                className="fb-input"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={13}
              />
              <p className="fb-hint">당첨 시 기프티콘 발송에만 사용됩니다.</p>
            </div>

            {/* 구분선 */}
            <div className="fb-divider">
              <span>선택 항목</span>
            </div>

            {/* 추천 의향 */}
            <div className="fb-field">
              <label className="fb-label">추천하고 싶은 사장님 친구가 있다면 몇 명?</label>
              <div className="fb-chips">
                {["0명", "1~2명", "3명 이상"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`fb-chip${recommendCount === opt ? " active" : ""}`}
                    onClick={() => setRecommendCount(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 바라는 기능 */}
            <div className="fb-field">
              <label className="fb-label">VELA에 가장 바라는 기능 한 가지</label>
              <input
                type="text"
                className="fb-input"
                placeholder="예: 배달앱 매출 자동 연동"
                value={wantedFeature}
                onChange={(e) => setWantedFeature(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* 한 줄 추천사 */}
            <div className="fb-field">
              <label className="fb-label">한 줄 추천사 (마케팅 활용 동의 시)</label>
              <input
                type="text"
                className="fb-input"
                placeholder="예: 매출 분석이 이렇게 쉬울 줄 몰랐어요!"
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
                maxLength={100}
              />
              <p className="fb-hint">작성해주시면 VELA 홈페이지에 익명으로 게재될 수 있습니다.</p>
            </div>

            {error && <div className="fb-error">{error}</div>}

            <button
              type="submit"
              className="fb-submit"
              disabled={submitting || (!!user && !simUsed)}
              style={{ opacity: (submitting || (!!user && !simUsed)) ? 0.5 : 1 }}
            >
              {!user ? "피드백 제출하기" : !simUsed ? "시뮬레이터 사용 후 제출 가능" : submitting ? "제출 중..." : "피드백 제출하고 스탠다드 체험 받기"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const baseStyle = `
  *{box-sizing:border-box;margin:0;padding:0}

  .fb-page{min-height:100vh;padding:120px 24px 80px}
  .fb-inner{max-width:640px;margin:0 auto}

  .fb-header{text-align:center;margin-bottom:48px}
  .fb-tag{display:inline-block;background:#EBF3FF;color:#3182F6;font-size:13px;font-weight:600;padding:5px 14px;border-radius:100px;margin-bottom:16px}
  .fb-title{font-size:clamp(26px,4vw,36px);font-weight:800;letter-spacing:-0.02em;color:#191F28;margin-bottom:12px}
  .fb-subtitle{font-size:15px;color:#6B7684;line-height:1.7}

  .fb-login-notice{background:#FFF8E1;border:1px solid #FFE082;border-radius:16px;padding:20px;text-align:center;margin-bottom:32px;font-size:14px;color:#F57F17}

  .fb-form{display:flex;flex-direction:column;gap:28px}

  .fb-field{display:flex;flex-direction:column;gap:8px}
  .fb-label{font-size:14px;font-weight:600;color:#333D4B;display:flex;align-items:center;gap:4px}
  .fb-req{color:#F44336;font-weight:700}
  .fb-char-count{margin-left:auto;font-size:12px;font-weight:400;color:#9EA6B3}
  .fb-hint{font-size:12px;color:#9EA6B3;margin-top:2px}

  .fb-input{width:100%;padding:14px 16px;border:1.5px solid #E5E8EB;border-radius:12px;font-size:15px;font-family:'Pretendard',sans-serif;color:#191F28;background:#fff;outline:none;transition:border-color .15s}
  .fb-input:focus{border-color:#3182F6}
  .fb-input::placeholder{color:#B0B8C1}

  .fb-textarea{width:100%;padding:14px 16px;border:1.5px solid #E5E8EB;border-radius:12px;font-size:15px;font-family:'Pretendard',sans-serif;color:#191F28;background:#fff;outline:none;resize:vertical;transition:border-color .15s;line-height:1.6}
  .fb-textarea:focus{border-color:#3182F6}
  .fb-textarea::placeholder{color:#B0B8C1}

  .fb-chips{display:flex;flex-wrap:wrap;gap:8px}
  .fb-chip{padding:8px 16px;border:1.5px solid #E5E8EB;border-radius:100px;background:#fff;font-size:13px;font-weight:500;color:#6B7684;cursor:pointer;font-family:'Pretendard',sans-serif;transition:all .15s}
  .fb-chip:hover{border-color:#3182F6;color:#3182F6}
  .fb-chip.active{background:#3182F6;color:#fff;border-color:#3182F6}

  .fb-scale{display:flex;gap:8px}
  .fb-scale-btn{width:48px;height:48px;border:1.5px solid #E5E8EB;border-radius:12px;background:#fff;font-size:18px;font-weight:700;color:#6B7684;cursor:pointer;font-family:'Pretendard',sans-serif;transition:all .15s}
  .fb-scale-btn:hover{border-color:#3182F6;color:#3182F6}
  .fb-scale-btn.active{background:#3182F6;color:#fff;border-color:#3182F6}
  .fb-scale-labels{display:flex;justify-content:space-between;font-size:12px;color:#9EA6B3;margin-top:4px;padding:0 2px}

  .fb-divider{display:flex;align-items:center;gap:16px;margin:8px 0;color:#B0B8C1;font-size:13px;font-weight:500}
  .fb-divider::before,.fb-divider::after{content:'';flex:1;height:1px;background:#E5E8EB}

  .fb-error{background:#FFF0F0;border:1px solid #FFCDD2;border-radius:12px;padding:14px 16px;font-size:14px;color:#D32F2F}

  .fb-submit{width:100%;padding:16px;border-radius:12px;font-size:16px;font-weight:700;border:none;cursor:pointer;font-family:'Pretendard',sans-serif;background:#3182F6;color:#fff;transition:background .15s;margin-top:8px}
  .fb-submit:hover{background:#2563EB}
  .fb-submit:disabled{cursor:not-allowed}

  .fb-success{text-align:center;padding:80px 24px}
  .fb-btn{display:inline-block;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;font-family:'Pretendard',sans-serif;transition:all .15s}
  .fb-btn-blue{background:#3182F6;color:#fff}
  .fb-btn-blue:hover{background:#2563EB}
  .fb-btn-gray{background:#F2F4F6;color:#333D4B}
  .fb-btn-gray:hover{background:#E5E8EB}

  /* Dark mode */
  html.dark .fb-page{background:#0F172A}
  html.dark .fb-title{color:#F1F5F9}
  html.dark .fb-subtitle{color:#CBD5E1}
  html.dark .fb-label{color:#F1F5F9}
  html.dark .fb-hint{color:#94A3B8}
  html.dark .fb-char-count{color:#94A3B8}
  html.dark .fb-input,html.dark .fb-textarea{background:#1E293B;color:#E2E8F0;border-color:#334155}
  html.dark .fb-input::placeholder,html.dark .fb-textarea::placeholder{color:#94A3B8}
  html.dark .fb-input:focus,html.dark .fb-textarea:focus{border-color:#3182F6}
  html.dark .fb-chip{background:#1E293B;color:#CBD5E1;border-color:#334155}
  html.dark .fb-chip:hover{border-color:#3182F6;color:#93C5FD}
  html.dark .fb-chip.active{background:#3182F6;color:#fff;border-color:#3182F6}
  html.dark .fb-scale-btn{background:#1E293B;color:#CBD5E1;border-color:#334155}
  html.dark .fb-scale-btn:hover{border-color:#3182F6;color:#93C5FD}
  html.dark .fb-scale-btn.active{background:#3182F6;color:#fff;border-color:#3182F6}
  html.dark .fb-scale-labels{color:#94A3B8}
  html.dark .fb-divider{color:#94A3B8}
  html.dark .fb-divider::before,html.dark .fb-divider::after{background:#334155}
  html.dark .fb-login-notice{background:rgba(234,179,8,0.1);border-color:#92400E;color:#FDE047}
  html.dark .fb-error{background:rgba(239,68,68,0.1);border-color:#7F1D1D;color:#FCA5A5}
  html.dark .fb-tag{background:rgba(59,130,246,0.15);color:#93C5FD}
  html.dark .fb-btn-gray{background:#334155;color:#E2E8F0}
  html.dark .fb-btn-gray:hover{background:#475569}
`;
