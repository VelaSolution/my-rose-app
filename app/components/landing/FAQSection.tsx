"use client";

import { useState } from "react";
import { FadeIn } from "./LandingUtils";

const FAQS = [
  { q: "진짜 무료인가요?", a: "네, 시뮬레이터와 기본 도구는 완전 무료입니다. 회원가입만 하면 바로 쓸 수 있어요. 유료 기능은 더 필요할 때 업그레이드하시면 됩니다." },
  { q: "우리 업종도 되나요?", a: "카페, 음식점, 술집/바, 파인다이닝, 고깃집 5개 업종을 지원합니다. 업종별 원가 구조가 다르게 계산돼요." },
  { q: "입력한 매출 데이터는 안전한가요?", a: "네, 로그인하면 클라우드에 암호화 저장됩니다. 다른 사람은 절대 볼 수 없어요." },
  { q: "POS기에서 데이터를 가져올 수 있나요?", a: "엑셀(xlsx, csv) 파일을 업로드하면 AI가 자동으로 분석합니다. POS에서 매출 내보내기 하신 파일 그대로 올리시면 돼요." },
  { q: "구독은 언제든 취소 가능한가요?", a: "네, 언제든 취소 가능합니다. 취소해도 결제 기간까지는 계속 쓸 수 있어요." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden transition-all"
    >
      <div className="flex items-center justify-between px-6 py-5">
        <p className="text-[15px] font-semibold text-slate-900 pr-4">Q. {q}</p>
        <span className={`text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}>▾</span>
      </div>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
        </div>
      )}
    </button>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="features-bg">
      <div className="section-inner" style={{ maxWidth: 640 }}>
        <FadeIn>
          <span className="section-tag">FAQ</span>
          <h2 className="section-title">자주 묻는 질문</h2>
        </FadeIn>
        <div className="flex flex-col gap-4 mt-10">
          {FAQS.map((faq) => (
            <FadeIn key={faq.q}>
              <FAQItem q={faq.q} a={faq.a} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
