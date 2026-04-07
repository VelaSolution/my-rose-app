import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .wrap{max-width:760px;margin:0 auto;padding:120px 24px 80px}
        .back{display:inline-flex;align-items:center;gap:8px;color:#6B7684;font-size:14px;text-decoration:none;margin-bottom:40px;transition:color .15s}
        .back:hover{color:#191F28}
        .tag{display:inline-block;background:#EBF3FF;color:#3182F6;font-size:13px;font-weight:600;padding:5px 14px;border-radius:100px;margin-bottom:16px}
        .title{font-size:clamp(28px,4vw,42px);font-weight:800;letter-spacing:-0.02em;color:#191F28;margin-bottom:8px}
        .date{font-size:14px;color:#9EA6B3;margin-bottom:48px}
        .sec{margin-bottom:40px}
        .h2{font-size:20px;font-weight:700;color:#191F28;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #E5E8EB}
        .p{font-size:15px;color:#333D4B;line-height:1.8;margin-bottom:12px}
        .ul{padding-left:20px;margin-bottom:12px}
        .ul li{font-size:15px;color:#333D4B;line-height:1.8;margin-bottom:6px}
        .hl{background:#EBF3FF;border-left:3px solid #3182F6;padding:16px 20px;border-radius:0 12px 12px 0;margin-bottom:16px;font-size:14px;color:#333D4B;line-height:1.8}
        .table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px}
        .table th{background:#F2F4F6;padding:12px 16px;text-align:left;font-weight:600;color:#333D4B;border:1px solid #E5E8EB}
        .table td{padding:12px 16px;border:1px solid #E5E8EB;color:#333D4B;vertical-align:top}
      `}</style>

      <div className="wrap">
        <Link href="/" className="back">← 홈으로</Link>

        <span className="tag">법적 고지</span>
        <h1 className="title">개인정보처리방침</h1>
        <div className="date">시행일: 2026년 1월 1일 · 최종 수정: 2026년 3월 29일</div>

        <div className="hl">
          VELA는 회원의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 회사가 수집하는 개인정보의 종류, 이용 목적, 보관 기간 등을 설명합니다.
        </div>

        <div className="sec">
          <h2 className="h2">1. 수집하는 개인정보</h2>
          <table className="table">
            <thead>
              <tr><th>구분</th><th>수집 항목</th><th>수집 방법</th></tr>
            </thead>
            <tbody>
              <tr><td>회원가입</td><td>이메일, 비밀번호, 이름</td><td>직접 입력</td></tr>
              <tr><td>소셜 로그인</td><td>이메일, 이름, 프로필 이미지</td><td>OAuth 연동</td></tr>
              <tr><td>전화번호 인증</td><td>전화번호</td><td>SMS 인증</td></tr>
              <tr><td>서비스 이용</td><td>시뮬레이션 입력 데이터, 접속 로그, 쿠키</td><td>자동 수집</td></tr>
              <tr><td>결제</td><td>결제 수단 정보 (카드사에서 처리)</td><td>결제 시 입력</td></tr>
            </tbody>
          </table>
          <p className="p">민감 정보(주민등록번호 등)는 수집하지 않습니다.</p>
        </div>

        <div className="sec">
          <h2 className="h2">2. 개인정보 이용 목적</h2>
          <ul className="ul">
            <li>회원 가입·관리 및 본인 확인</li>
            <li>서비스 제공 (시뮬레이션, AI 분석, 히스토리 저장)</li>
            <li>유료 서비스 결제 처리 및 청구</li>
            <li>서비스 개선 및 신규 기능 개발</li>
            <li>공지사항 전달 및 고객 문의 응대</li>
            <li>불법·부정 이용 방지</li>
          </ul>
        </div>

        <div className="sec">
          <h2 className="h2">3. 개인정보 보관 기간</h2>
          <table className="table">
            <thead>
              <tr><th>보관 항목</th><th>보관 기간</th><th>근거</th></tr>
            </thead>
            <tbody>
              <tr><td>회원 정보</td><td>회원 탈퇴 시까지</td><td>서비스 제공</td></tr>
              <tr><td>결제 기록</td><td>5년</td><td>전자상거래법</td></tr>
              <tr><td>접속 로그</td><td>3개월</td><td>통신비밀보호법</td></tr>
              <tr><td>불만·분쟁 기록</td><td>3년</td><td>전자상거래법</td></tr>
            </tbody>
          </table>
          <p className="p">보관 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.</p>
        </div>

        <div className="sec">
          <h2 className="h2">4. 제3자 제공</h2>
          <p className="p">회사는 원칙적으로 회원의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우 예외로 합니다.</p>
          <ul className="ul">
            <li>회원이 사전에 동의한 경우</li>
            <li>법령의 규정에 따라 수사기관 등이 요청하는 경우</li>
          </ul>
        </div>

        <div className="sec">
          <h2 className="h2">5. 위탁 처리</h2>
          <table className="table">
            <thead>
              <tr><th>수탁업체</th><th>위탁 업무</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase Inc.</td><td>데이터베이스 및 인증 서비스</td></tr>
              <tr><td>Vercel Inc.</td><td>서비스 호스팅</td></tr>
              <tr><td>Anthropic PBC</td><td>AI 분석 처리</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sec">
          <h2 className="h2">6. 쿠키 및 자동 수집</h2>
          <p className="p">서비스는 로그인 상태 유지 및 사용자 경험 개선을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.</p>
        </div>

        <div className="sec">
          <h2 className="h2">7. 회원의 권리</h2>
          <p className="p">회원은 언제든지 아래 권리를 행사할 수 있습니다.</p>
          <ul className="ul">
            <li><strong>열람권</strong>: 본인의 개인정보 처리 현황 열람 요청</li>
            <li><strong>정정권</strong>: 부정확한 개인정보 정정 요청</li>
            <li><strong>삭제권</strong>: 개인정보 삭제 요청 (단, 법령에 의한 보관 의무 있는 경우 제외)</li>
            <li><strong>처리 정지권</strong>: 개인정보 처리 정지 요청</li>
          </ul>
          <p className="p">권리 행사는 mnhyuk@velaanalytics.com로 이메일 문의 주시면 지체 없이 처리합니다.</p>
        </div>

        <div className="sec">
          <h2 className="h2">8. 개인정보 보호책임자</h2>
          <ul className="ul">
            <li>성명: 김민혁 (벨라솔루션 대표)</li>
            <li>이메일: mnhyuk@velaanalytics.com</li>
            <li>사업자등록번호: 777-17-02386</li>
            <li>주소: 대전광역시 중구 당디로96번길 9, 204호(유천동)</li>
            <li>운영 시간: 평일 10:00 - 18:00</li>
          </ul>
          <p className="p">개인정보 침해 관련 신고·상담은 개인정보 침해신고센터(118), 개인정보 분쟁조정위원회(1833-6972)에 문의할 수 있습니다.</p>
        </div>

        <div className="sec">
          <h2 className="h2">9. 방침 변경</h2>
          <p className="p">개인정보처리방침이 변경되는 경우 서비스 내 공지를 통해 안내합니다. 변경 사항은 공지 후 7일이 경과한 시점부터 효력이 발생합니다.</p>
        </div>
      </div>
    </>
  );
}
