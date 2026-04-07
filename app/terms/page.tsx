import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .terms-wrap{max-width:760px;margin:0 auto;padding:120px 24px 80px}
        .terms-back{display:inline-flex;align-items:center;gap:8px;color:#6B7684;font-size:14px;text-decoration:none;margin-bottom:40px;transition:color .15s}
        .terms-back:hover{color:#191F28}
        .terms-tag{display:inline-block;background:#EBF3FF;color:#3182F6;font-size:13px;font-weight:600;padding:5px 14px;border-radius:100px;margin-bottom:16px}
        .terms-title{font-size:clamp(28px,4vw,42px);font-weight:800;letter-spacing:-0.02em;color:#191F28;margin-bottom:8px}
        .terms-date{font-size:14px;color:#9EA6B3;margin-bottom:48px}
        .terms-section{margin-bottom:40px}
        .terms-h2{font-size:20px;font-weight:700;color:#191F28;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #E5E8EB}
        .terms-p{font-size:15px;color:#333D4B;line-height:1.8;margin-bottom:12px}
        .terms-list{padding-left:20px;margin-bottom:12px}
        .terms-list li{font-size:15px;color:#333D4B;line-height:1.8;margin-bottom:6px}
        .terms-highlight{background:#EBF3FF;border-left:3px solid #3182F6;padding:16px 20px;border-radius:0 12px 12px 0;margin-bottom:16px;font-size:14px;color:#333D4B;line-height:1.8}
      `}</style>

      <div className="terms-wrap">
        <Link href="/" className="terms-back">← 홈으로</Link>

        <span className="terms-tag">법적 고지</span>
        <h1 className="terms-title">이용약관</h1>
        <div className="terms-date">시행일: 2026년 1월 1일 · 최종 수정: 2026년 3월 29일</div>

        <div className="terms-highlight">
          본 약관은 VELA(이하 &ldquo;서비스&rdquo;)를 이용하는 모든 회원에게 적용됩니다. 서비스에 가입하거나 이용함으로써 본 약관에 동의하는 것으로 간주됩니다.
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제1조 (목적)</h2>
          <p className="terms-p">본 약관은 VELA(이하 &ldquo;회사&rdquo;)가 제공하는 외식업 경영 분석 서비스(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제2조 (정의)</h2>
          <p className="terms-p">본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ul className="terms-list">
            <li><strong>&ldquo;서비스&rdquo;</strong>란 회사가 제공하는 외식업 수익 시뮬레이터, AI 경영 분석, POS 데이터 분석 등 모든 기능을 말합니다.</li>
            <li><strong>&ldquo;회원&rdquo;</strong>이란 본 약관에 동의하고 서비스에 가입한 자를 말합니다.</li>
            <li><strong>&ldquo;유료 회원&rdquo;</strong>이란 유료 구독 플랜에 가입하여 서비스를 이용하는 회원을 말합니다.</li>
            <li><strong>&ldquo;콘텐츠&rdquo;</strong>란 회원이 서비스를 이용하여 생성·저장한 시뮬레이션 데이터, 분석 결과 등을 말합니다.</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제3조 (서비스 제공)</h2>
          <p className="terms-p">회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="terms-list">
            <li>외식업 수익 구조 시뮬레이션 서비스</li>
            <li>AI 기반 경영 분석 및 전략 추천</li>
            <li>POS 데이터 분석 서비스</li>
            <li>월별 히스토리 저장 및 공유 기능</li>
            <li>기타 회사가 정하는 서비스</li>
          </ul>
          <p className="terms-p">서비스는 연중무휴 24시간 제공됩니다. 단, 시스템 점검·장애·기타 사유로 일시적으로 중단될 수 있으며, 이 경우 사전에 공지합니다.</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제4조 (회원가입 및 계정)</h2>
          <p className="terms-p">이용자는 회사가 정한 가입 양식에 따라 정보를 기입하고 본 약관에 동의함으로써 회원가입을 신청합니다.</p>
          <ul className="terms-list">
            <li>만 14세 미만의 경우 서비스에 가입할 수 없습니다.</li>
            <li>회원은 실명 및 정확한 정보를 제공해야 하며, 허위 정보 제공으로 발생하는 불이익은 회원 본인이 부담합니다.</li>
            <li>계정은 양도·판매·대여할 수 없으며, 제3자가 이용하도록 할 수 없습니다.</li>
            <li>비밀번호의 관리 책임은 회원에게 있으며, 제3자에게 노출되지 않도록 관리해야 합니다.</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제5조 (유료 서비스 및 결제)</h2>
          <p className="terms-p">일부 서비스는 유료로 제공됩니다. 유료 서비스 이용을 위해서는 별도의 결제가 필요합니다.</p>
          <ul className="terms-list">
            <li>유료 플랜의 요금은 서비스 내 요금 안내 페이지에서 확인할 수 있습니다.</li>
            <li>구독 요금은 매월 자동으로 결제됩니다.</li>
            <li>구독은 언제든지 해지할 수 있으며, 해지 시 당월 말까지 유료 기능을 이용할 수 있습니다.</li>
            <li>이미 결제된 금액은 원칙적으로 환불되지 않으나, 서비스 오류로 인한 경우 관련 법령에 따라 처리합니다.</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제6조 (서비스 이용 제한)</h2>
          <p className="terms-p">회원은 다음 행위를 해서는 안 됩니다.</p>
          <ul className="terms-list">
            <li>허위 정보를 입력하거나 타인의 정보를 도용하는 행위</li>
            <li>서비스를 상업적 목적으로 무단 복제·배포하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하는 행위</li>
            <li>관련 법령이나 본 약관을 위반하는 행위</li>
            <li>회사 또는 제3자의 지식재산권을 침해하는 행위</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제7조 (면책 조항)</h2>
          <p className="terms-p">VELA가 제공하는 시뮬레이션 결과 및 AI 분석은 참고용으로만 활용되어야 합니다.</p>
          <div className="terms-highlight">
            ⚠️ 본 서비스의 계산 결과는 입력된 데이터를 바탕으로 산출된 추정치입니다. 실제 사업 성과와 차이가 있을 수 있으며, 회사는 이로 인한 사업적 손실에 대해 책임을 지지 않습니다. 중요한 경영 의사결정 전 전문 회계사·세무사·경영 컨설턴트와 상담하시기 바랍니다.
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제8조 (개인정보 보호)</h2>
          <p className="terms-p">회사는 관련 법령에 따라 회원의 개인정보를 보호합니다. 개인정보 처리에 관한 사항은 별도의 <Link href="/privacy" style={{ color: "#3182F6" }}>개인정보처리방침</Link>을 따릅니다.</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제9조 (약관의 변경)</h2>
          <p className="terms-p">회사는 필요한 경우 약관을 변경할 수 있습니다. 변경된 약관은 서비스 내 공지 후 7일이 경과한 시점부터 효력이 발생합니다. 변경 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">제10조 (준거법 및 관할)</h2>
          <p className="terms-p">본 약관은 대한민국 법률에 따라 규율됩니다. 서비스 이용과 관련한 분쟁이 발생할 경우 회사의 본점 소재지를 관할하는 법원을 합의 관할 법원으로 합니다.</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-h2">문의처</h2>
          <p className="terms-p">이용약관에 관한 문의사항이 있으시면 아래로 연락해 주세요.</p>
          <ul className="terms-list">
            <li>상호명: 벨라솔루션 | 대표자: 김민혁</li>
            <li>사업자등록번호: 777-17-02386</li>
            <li>주소: 대전광역시 중구 당디로96번길 9, 204호(유천동)</li>
            <li>이메일: mnhyuk@velaanalytics.com</li>
            <li>운영 시간: 평일 10:00 - 18:00</li>
          </ul>
        </div>
      </div>
    </>
  );
}
