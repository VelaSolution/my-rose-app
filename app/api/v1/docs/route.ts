import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VELA API v1 Documentation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pretendard', -apple-system, system-ui, sans-serif; background: #F9FAFB; color: #191F28; line-height: 1.7; }
    .container { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
    .header { background: #0F172A; color: #E2E8F0; padding: 48px 24px; text-align: center; }
    .header h1 { font-size: 36px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .header p { color: #94A3B8; font-size: 16px; }
    .header .version { display: inline-block; background: #3182F6; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 700; margin: 48px 0 16px; padding-top: 24px; border-top: 1px solid #E5E8EB; }
    h3 { font-size: 16px; font-weight: 700; margin: 28px 0 10px; color: #334155; }
    p, li { margin-bottom: 8px; color: #4E5968; font-size: 15px; }
    code { background: #F2F4F6; padding: 2px 8px; border-radius: 6px; font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace; color: #0F172A; }
    pre { background: #1E293B; color: #E2E8F0; padding: 20px 24px; border-radius: 12px; overflow-x: auto; margin: 12px 0 24px; font-size: 13px; line-height: 1.7; position: relative; }
    pre .lang { position: absolute; top: 8px; right: 12px; font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; }
    .badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 6px; margin-right: 8px; }
    .badge-post { background: #3182F6; color: #fff; }
    .badge-get { background: #059669; color: #fff; }
    .badge-auth { background: #F59E0B; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid #E5E8EB; font-size: 14px; }
    th { background: #F8FAFC; font-weight: 600; color: #6B7684; }
    td code { font-size: 12px; }
    .card { background: #fff; border: 1px solid #E5E8EB; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .card-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .tabs { display: flex; gap: 4px; margin-bottom: -1px; position: relative; z-index: 1; }
    .tab { padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px 8px 0 0; cursor: pointer; border: 1px solid transparent; color: #6B7684; background: #F2F4F6; }
    .tab.active { background: #1E293B; color: #E2E8F0; border-color: #1E293B; }
    .note { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px 18px; margin: 16px 0; font-size: 14px; color: #1E40AF; }
    .note-warn { background: #FEF3C7; border-color: #FCD34D; color: #92400E; }
    .toc { background: #fff; border: 1px solid #E5E8EB; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .toc a { color: #3182F6; text-decoration: none; font-size: 14px; font-weight: 500; display: block; padding: 4px 0; }
    .toc a:hover { text-decoration: underline; }
    .response-field { display: grid; grid-template-columns: 140px 80px 1fr; gap: 4px; padding: 8px 0; border-bottom: 1px solid #F2F4F6; font-size: 13px; }
    .response-field:last-child { border: none; }
    .field-name { font-weight: 600; color: #0F172A; }
    .field-type { color: #3182F6; font-family: monospace; font-size: 12px; }
    .field-desc { color: #6B7684; }
    footer { text-align: center; padding: 40px; color: #94A3B8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <span class="version">v1.0</span>
    <h1>VELA API</h1>
    <p>외식업 경영 분석 엔진 — POS 시스템 연동용 REST API</p>
  </div>

  <div class="container">
    <div class="toc">
      <p style="font-weight:700;margin-bottom:8px;color:#191F28;">목차</p>
      <a href="#auth">1. 인증</a>
      <a href="#analyze">2. POST /api/v1/analyze</a>
      <a href="#response">3. 응답 필드 설명</a>
      <a href="#examples">4. SDK 코드 예시</a>
      <a href="#errors">5. 에러 코드</a>
      <a href="#ratelimit">6. Rate Limit</a>
      <a href="#changelog">7. Changelog</a>
      <a href="#contact">8. 문의</a>
    </div>

    <h2 id="auth">1. 인증</h2>
    <p>모든 요청에 <code>Authorization: Bearer YOUR_API_KEY</code> 헤더를 포함하세요.</p>
    <pre><span class="lang">HTTP</span>Authorization: Bearer vela_sk_xxxxxxxxxxxx</pre>
    <div class="note">API 키는 <a href="mailto:mnhyuk@velaanalytics.com">mnhyuk@velaanalytics.com</a>으로 요청하시면 발급해드립니다.</div>

    <h2 id="analyze">2. POST /api/v1/analyze</h2>
    <p><span class="badge badge-post">POST</span><span class="badge badge-auth">AUTH</span> 매출 데이터를 전송하면 경영 분석 결과를 JSON으로 반환합니다.</p>

    <h3>Request Body</h3>
    <table>
      <tr><th>필드</th><th>타입</th><th>필수</th><th>설명</th><th>예시</th></tr>
      <tr><td><code>industry</code></td><td>string</td><td>O</td><td>업종</td><td>cafe, restaurant, bar, gogi, finedining</td></tr>
      <tr><td><code>seats</code></td><td>number</td><td>O</td><td>좌석 수</td><td>20</td></tr>
      <tr><td><code>avgSpend</code></td><td>number</td><td>O</td><td>객단가 (원)</td><td>7000</td></tr>
      <tr><td><code>turnover</code></td><td>number</td><td>O</td><td>일 회전율</td><td>1.5</td></tr>
      <tr><td><code>cogsRate</code></td><td>number</td><td>O</td><td>원가율 (%)</td><td>32</td></tr>
      <tr><td><code>rent</code></td><td>number</td><td>O</td><td>월 임대료 (원)</td><td>2000000</td></tr>
      <tr><td><code>weekdayDays</code></td><td>number</td><td></td><td>평일 영업일 (기본 22)</td><td>22</td></tr>
      <tr><td><code>weekendDays</code></td><td>number</td><td></td><td>주말 영업일 (기본 8)</td><td>8</td></tr>
      <tr><td><code>utilities</code></td><td>number</td><td></td><td>공과금 (원)</td><td>500000</td></tr>
      <tr><td><code>laborCount</code></td><td>number</td><td></td><td>직원 수</td><td>3</td></tr>
      <tr><td><code>laborCost</code></td><td>number</td><td></td><td>총 인건비 (원)</td><td>3000000</td></tr>
      <tr><td><code>deliveryEnabled</code></td><td>boolean</td><td></td><td>배달 여부</td><td>false</td></tr>
      <tr><td><code>deliverySales</code></td><td>number</td><td></td><td>월 배달 매출 (원)</td><td>5000000</td></tr>
    </table>

    <h2 id="response">3. 응답 필드 설명</h2>
    <div class="card">
      <div class="card-title">summary (핵심 지표)</div>
      <div class="response-field"><span class="field-name">totalSales</span><span class="field-type">number</span><span class="field-desc">월 총 매출 (원)</span></div>
      <div class="response-field"><span class="field-name">profit</span><span class="field-type">number</span><span class="field-desc">세전 영업이익 (원)</span></div>
      <div class="response-field"><span class="field-name">netProfit</span><span class="field-type">number</span><span class="field-desc">세후 순이익 (원)</span></div>
      <div class="response-field"><span class="field-name">netMargin</span><span class="field-type">number</span><span class="field-desc">순이익률 (%)</span></div>
      <div class="response-field"><span class="field-name">isProfit</span><span class="field-type">boolean</span><span class="field-desc">흑자 여부</span></div>
    </div>
    <div class="card">
      <div class="card-title">costs (비용 구조)</div>
      <div class="response-field"><span class="field-name">cogs</span><span class="field-type">number</span><span class="field-desc">재료비 (원)</span></div>
      <div class="response-field"><span class="field-name">cogsRatio</span><span class="field-type">number</span><span class="field-desc">재료비율 (%)</span></div>
      <div class="response-field"><span class="field-name">laborCost</span><span class="field-type">number</span><span class="field-desc">인건비 (원)</span></div>
      <div class="response-field"><span class="field-name">laborRatio</span><span class="field-type">number</span><span class="field-desc">인건비율 (%)</span></div>
      <div class="response-field"><span class="field-name">rent</span><span class="field-type">number</span><span class="field-desc">임대료 (원)</span></div>
      <div class="response-field"><span class="field-name">rentRatio</span><span class="field-type">number</span><span class="field-desc">임대료율 (%)</span></div>
    </div>
    <div class="card">
      <div class="card-title">breakeven (손익분기)</div>
      <div class="response-field"><span class="field-name">bep</span><span class="field-type">number</span><span class="field-desc">손익분기 매출 (원)</span></div>
      <div class="response-field"><span class="field-name">achieved</span><span class="field-type">boolean</span><span class="field-desc">손익분기 달성 여부</span></div>
    </div>
    <div class="card">
      <div class="card-title">benchmark (업종 비교)</div>
      <div class="response-field"><span class="field-name">comparison</span><span class="field-type">object</span><span class="field-desc">원가율·순이익률 등 업종 평균 대비 차이</span></div>
    </div>
    <div class="card">
      <div class="card-title">strategies (AI 전략)</div>
      <div class="response-field"><span class="field-name">title</span><span class="field-type">string</span><span class="field-desc">전략 제목</span></div>
      <div class="response-field"><span class="field-name">impact</span><span class="field-type">string</span><span class="field-desc">영향도 (high/medium/low)</span></div>
      <div class="response-field"><span class="field-name">difficulty</span><span class="field-type">string</span><span class="field-desc">난이도 (high/medium/low)</span></div>
    </div>
    <div class="card">
      <div class="card-title">analysis (종합 평가)</div>
      <div class="response-field"><span class="field-name">score</span><span class="field-type">number</span><span class="field-desc">경영 점수 (0~100)</span></div>
      <div class="response-field"><span class="field-name">grade</span><span class="field-type">string</span><span class="field-desc">등급 (A+, A, B+, B, C, D, F)</span></div>
    </div>

    <h2 id="examples">4. SDK 코드 예시</h2>

    <h3>cURL</h3>
    <pre><span class="lang">bash</span>curl -X POST https://velaanalytics.com/api/v1/analyze \\
  -H "Authorization: Bearer vela_sk_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "industry": "cafe",
    "seats": 20,
    "avgSpend": 7000,
    "turnover": 1.5,
    "cogsRate": 32,
    "rent": 2000000
  }'</pre>

    <h3>JavaScript / Node.js</h3>
    <pre><span class="lang">javascript</span>const res = await fetch("https://velaanalytics.com/api/v1/analyze", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vela_sk_xxxxxxxxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    industry: "cafe",
    seats: 20,
    avgSpend: 7000,
    turnover: 1.5,
    cogsRate: 32,
    rent: 2000000,
  }),
});
const data = await res.json();
console.log(data.summary.netProfit); // 2180000</pre>

    <h3>Python</h3>
    <pre><span class="lang">python</span>import requests

res = requests.post(
    "https://velaanalytics.com/api/v1/analyze",
    headers={"Authorization": "Bearer vela_sk_xxxxxxxxxxxx"},
    json={
        "industry": "cafe",
        "seats": 20,
        "avgSpend": 7000,
        "turnover": 1.5,
        "cogsRate": 32,
        "rent": 2000000,
    },
)
data = res.json()
print(data["summary"]["netProfit"])  # 2180000</pre>

    <h3>응답 예시 (전체)</h3>
    <pre><span class="lang">json</span>{
  "industry": { "key": "cafe", "label": "카페" },
  "summary": {
    "totalSales": 18200000,
    "profit": 2840000,
    "netProfit": 2180000,
    "netMargin": 12.0,
    "isProfit": true
  },
  "costs": {
    "cogs": 5824000, "cogsRatio": 32.0,
    "laborCost": 3000000, "laborRatio": 16.5,
    "rent": 2000000, "rentRatio": 11.0
  },
  "breakeven": { "bep": 14800000, "achieved": true },
  "benchmark": {
    "comparison": {
      "cogsRate": { "mine": 32.0, "average": 35.0, "diff": -3.0 },
      "netMargin": { "mine": 12.0, "average": 10.0, "diff": 2.0 }
    }
  },
  "strategies": [
    { "title": "객단가 10% 인상", "impact": "high", "difficulty": "medium" },
    { "title": "배달 채널 추가", "impact": "medium", "difficulty": "low" }
  ],
  "analysis": { "score": 78, "grade": "B+" }
}</pre>

    <h2 id="errors">5. 에러 코드</h2>
    <table>
      <tr><th>코드</th><th>의미</th><th>대응 방법</th></tr>
      <tr><td><code>400</code></td><td>잘못된 요청</td><td>필수 파라미터(industry, seats, avgSpend, turnover, cogsRate, rent) 확인</td></tr>
      <tr><td><code>401</code></td><td>인증 실패</td><td>Authorization 헤더에 유효한 API 키 확인</td></tr>
      <tr><td><code>429</code></td><td>요청 한도 초과</td><td>1분 후 재시도. 한도 상향 필요 시 문의</td></tr>
      <tr><td><code>500</code></td><td>서버 오류</td><td>잠시 후 재시도. 지속 시 문의</td></tr>
    </table>
    <p>에러 응답 형식:</p>
    <pre><span class="lang">json</span>{ "error": "Missing required field: seats" }</pre>

    <h2 id="ratelimit">6. Rate Limit</h2>
    <table>
      <tr><th>플랜</th><th>제한</th></tr>
      <tr><td>기본</td><td>100 요청/분</td></tr>
      <tr><td>파트너</td><td>1,000 요청/분 (별도 협의)</td></tr>
    </table>
    <div class="note note-warn">한도 초과 시 <code>429</code> 응답과 함께 <code>Retry-After</code> 헤더가 반환됩니다.</div>

    <h2 id="changelog">7. Changelog</h2>
    <table>
      <tr><th>버전</th><th>날짜</th><th>변경 사항</th></tr>
      <tr><td><code>v1.0</code></td><td>2026-04-15</td><td>최초 공개 — analyze 엔드포인트, 5개 업종 지원</td></tr>
      <tr><td><code>v1.1</code></td><td>2026-04-20</td><td>finedining 업종 추가, 벤치마크 비교 개선, SDK 예시 추가</td></tr>
    </table>

    <h2 id="contact">8. 문의</h2>
    <div class="card">
      <p><strong>API 키 발급 · 파트너십 · 기술 지원</strong></p>
      <p>이메일: <a href="mailto:mnhyuk@velaanalytics.com">mnhyuk@velaanalytics.com</a></p>
      <p>데모: <a href="https://velaanalytics.com/demo">velaanalytics.com/demo</a></p>
      <p>서비스: <a href="https://velaanalytics.com">velaanalytics.com</a></p>
    </div>
  </div>

  <footer>© 2026 벨라솔루션. All rights reserved.</footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
