import Link from "next/link";
import { FadeIn } from "./LandingUtils";

export function CTASection() {
  return (
    <section className="cta-bg">
      <div className="section-inner">
        <FadeIn>
          <h2 className="cta-title">내 매장, 지금 돈 벌고 있는 건지<br />30초만에 확인하세요</h2>
          <p className="cta-desc">회원가입 없이 바로 써볼 수 있어요. 무료입니다.</p>
          <Link href="/simulator" className="btn-white">시뮬레이터 시작하기 →</Link>
        </FadeIn>
      </div>
    </section>
  );
}
