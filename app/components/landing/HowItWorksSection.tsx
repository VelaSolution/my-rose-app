import { FadeIn } from "./LandingUtils";

const STEPS = [
  { num: "1", title: "내 매장 정보 입력", desc: "업종, 좌석 수, 객단가, 월세, 재료비율만 넣으면 됩니다. 30초면 충분해요.", delay: 0 },
  { num: "2", title: "수익 바로 확인", desc: "매출, 비용, 순이익이 자동으로 계산됩니다. 최소 얼마를 벌어야 적자가 안 나는지도 알려줘요.", delay: 100 },
  { num: "3", title: "뭘 바꿔야 할지 확인", desc: "객단가를 올리면? 재료비를 줄이면? 숫자를 바꿔가며 어디를 손봐야 돈이 남는지 직접 확인하세요.", delay: 200 },
];

export function HowItWorksSection() {
  return (
    <section id="how">
      <div className="section-inner">
        <FadeIn>
          <div style={{ textAlign: "center" }}>
            <span className="section-tag">사용 방법</span>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              <span className="gradient-text">30초</span>면 끝납니다
            </h2>
          </div>
        </FadeIn>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <FadeIn key={s.num} delay={s.delay}>
              <div className="step-card">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
