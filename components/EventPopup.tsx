"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function EventPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissKey = "vela-event-dismissed";
      const dismissId = "open-beta-2026-04";
      const todayKey = "vela-event-today";
      if (localStorage.getItem(dismissKey) === dismissId) return;
      if (localStorage.getItem(todayKey) === new Date().toISOString().slice(0, 10)) return;
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    } catch {}
  }, []);

  const close = () => {
    try { localStorage.setItem("vela-event-today", new Date().toISOString().slice(0, 10)); } catch {}
    setShow(false);
  };

  const closeForever = () => {
    try { localStorage.setItem("vela-event-dismissed", "open-beta-2026-04"); } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          border: "1px solid #E5E8EB",
          position: "relative",
          overflow: "hidden",
          width: "100%",
          maxWidth: 440,
          animation: "eventPopIn 0.3s ease-out",
        }}
      >
        {/* 장식 */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, background: "radial-gradient(circle,rgba(49,130,246,0.1),transparent)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, background: "radial-gradient(circle,rgba(5,150,105,0.08),transparent)", borderRadius: "50%" }} />

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ background: "#EBF3FF", color: "#3182F6", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>
            EVENT
          </span>
          <button
            onClick={close}
            aria-label="닫기"
            style={{ fontSize: 11, color: "#9EA6B3", background: "#F2F4F6", padding: "3px 10px", borderRadius: 100, fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            닫기
          </button>
        </div>

        {/* 타이틀 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#191F28", letterSpacing: "-0.02em", lineHeight: 1.4, margin: 0 }}>
            오픈 체험단 이벤트
          </h2>
          <p style={{ fontSize: 14, color: "#6B7684", marginTop: 8, lineHeight: 1.6 }}>
            피드백만 남기면 <b style={{ color: "#059669" }}>스탠다드 1개월 무료</b><br />
            + 추첨 10명 <b style={{ color: "#3182F6" }}>스타벅스 기프티콘</b>
          </p>
        </div>

        {/* 참여 방법 */}
        <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#9EA6B3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>참여 방법</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { step: "1", text: "회원가입 (카카오 3초)" },
              { step: "2", text: "수익 시뮬레이터 1회 사용" },
              { step: "3", text: "피드백 폼 작성 (3~5분)" },
            ].map((s) => (
              <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: "50%", background: "#3182F6",
                  color: "#fff", fontSize: 12, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {s.step}
                </span>
                <span style={{ fontSize: 14, color: "#333D4B", fontWeight: 500 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 상품 */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#ECFDF5", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginBottom: 4 }}>전원</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>스탠다드 1개월</p>
          </div>
          <div style={{ flex: 1, background: "#EBF3FF", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#3182F6", fontWeight: 600, marginBottom: 4 }}>추첨 10명</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#3182F6" }}>스타벅스 기프티콘</p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/event/feedback"
          onClick={closeForever}
          style={{ display: "block", width: "100%", textAlign: "center", background: "#3182F6", color: "#fff", padding: "14px 0", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", transition: "background 0.15s" }}
        >
          지금 참여하기
        </Link>

        <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9EA6B3" }}>
          소요 시간 약 5분 ·{" "}
          <button onClick={closeForever} style={{ background: "none", border: "none", color: "#9EA6B3", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            다시 보지 않기
          </button>
          {" · "}
          <button onClick={close} style={{ background: "none", border: "none", color: "#9EA6B3", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            오늘 하루 안 보기
          </button>
        </p>
      </div>

      <style>{`
        @keyframes eventPopIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
