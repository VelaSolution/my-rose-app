"use client";

import { FadeIn } from "./LandingUtils";

const CARDS = [
  { icon: "🧭", title: "데이터 = 바람", desc: "읽을 줄 알면 원하는 곳에 갈 수 있습니다" },
  { icon: "⛵", title: "VELA = 돛", desc: "바람을 잡아 방향을 만들어드립니다" },
  { icon: "🗺️", title: "도구 = 항해 장비", desc: "사장님의 나침반이 되어드립니다" },
];

export function BrandStorySection() {
  return (
    <section style={{ background: "var(--gray-50)" }}>
      <div className="section-inner" style={{ textAlign: "center" }}>
        <FadeIn>
          <span className="section-tag">About VELA</span>
          <h2 className="section-title" style={{ textAlign: "center" }}>
            모든 사장님은 자기 가게의 <span className="gradient-text">선장</span>입니다
          </h2>
          <p className="section-desc" style={{ textAlign: "center", margin: "0 auto 20px" }}>
            VELA는 라틴어로 <strong>&ldquo;돛&rdquo;</strong>을 뜻합니다.<br />
            바다 위에서 돛이 바람을 잡아 방향을 만들어주듯,<br />
            VELA는 데이터라는 바람을 읽어 사장님의 경영에 방향을 잡아드립니다.
          </p>
        </FadeIn>

        <div className="steps-grid" style={{ marginTop: 48 }}>
          {CARDS.map((c, i) => (
            <FadeIn key={c.title} delay={i * 120}>
              <div className="feature-card" style={{ textAlign: "center", padding: "36px 28px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{c.icon}</div>
                <div className="step-title" style={{ marginBottom: 8 }}>{c.title}</div>
                <div className="step-desc">{c.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={400}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(49,130,246,0.06)", border: "1px solid rgba(49,130,246,0.12)",
            borderRadius: 100, padding: "10px 24px", marginTop: 48,
            fontSize: 14, fontWeight: 600, color: "var(--gray-600)",
          }}>
            좌석 수랑 객단가만 넣으면 끝 — <span style={{ color: "var(--blue)", fontWeight: 700 }}>30초면 충분합니다</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
