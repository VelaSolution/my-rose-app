import { NextRequest } from "next/server";

export const runtime = "edge";

const VALID_INDUSTRIES = ["cafe", "restaurant", "bar", "finedining", "gogi"];
const MAX_CSV_ROWS = 300; // 행 기준 절삭 (문자 단위 절삭 대신)
const MAX_CSV_CHARS = 8000;

/** 행 단위로 CSV를 안전하게 절삭 — 데이터가 중간에 잘리는 것을 방지 */
function truncateCsvSafely(csvText: string): { text: string; truncated: boolean } {
  const lines = csvText.split("\n");
  if (lines.length <= MAX_CSV_ROWS && csvText.length <= MAX_CSV_CHARS) {
    return { text: csvText, truncated: false };
  }
  // 행 수 제한
  const rowLimited = lines.slice(0, MAX_CSV_ROWS).join("\n");
  // 문자 수 추가 제한 (행이 매우 긴 경우 대비)
  const result = rowLimited.length > MAX_CSV_CHARS ? rowLimited.slice(0, MAX_CSV_CHARS) : rowLimited;
  return { text: result, truncated: true };
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ error: "입력값 누락" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const { csvText, fileName, industry } = body;

  if (!csvText || typeof csvText !== "string") {
    return new Response(JSON.stringify({ error: "데이터가 없습니다." }), { status: 400 });
  }

  const safeIndustry = VALID_INDUSTRIES.includes(industry) ? industry : "restaurant";

  const industryLabels: Record<string, string> = {
    cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };

  const { text: safeCsvText, truncated } = truncateCsvSafely(csvText);
  const truncatedNote = truncated
    ? `\n(주의: 데이터가 방대하여 상위 ${MAX_CSV_ROWS}행만 분석되었습니다. 결과가 부분적일 수 있습니다.)`
    : "";

  const prompt = `당신은 POS 데이터 분석 전문가입니다.
아래는 ${industryLabels[safeIndustry] ?? "음식점"} POS에서 추출한 엑셀 파일(${fileName ?? "data.xlsx"})을 텍스트로 변환한 내용입니다.${truncatedNote}

[POS 데이터]
${safeCsvText}

위 데이터를 분석해서 아래 항목들을 추출해주세요.
데이터가 없거나 불확실한 항목은 null로 반환하세요.
금액은 반드시 숫자(원 단위)로만 반환하세요.

추출 항목:
- totalSales: 분석 기간 총 매출액 (원, 숫자)
- dailyAvgSales: 일 평균 매출액 (원, 숫자)
- avgSpend: 고객 1인당 평균 결제금액 객단가 (원, 숫자)
- totalTransactions: 총 결제 건수 (숫자)
- dailyAvgTransactions: 일 평균 결제 건수 (숫자)
- operatingDays: 영업일수 (숫자)
- weekdayDays: 평일 영업일수 (숫자)
- weekendDays: 주말 영업일수 (숫자)
- weekendSalesRatio: 주말 매출 비중 % (숫자, 없으면 null)
- peakHour: 가장 매출이 높은 시간대 (예: "12시~13시", 없으면 null)
- topMenus: 가장 많이 팔린 메뉴 top3 (문자열 배열, 없으면 null)
- deliverySales: 배달 매출 (원, 숫자, 없으면 null)
- cardSalesRatio: 카드 결제 비중 % (숫자, 없으면 null)
- dataStartDate: 데이터 시작일 YYYY-MM-DD (문자열, 없으면 null)
- dataEndDate: 데이터 종료일 YYYY-MM-DD (문자열, 없으면 null)
- analysisNote: 데이터 분석 시 특이사항이나 주의사항 (한국어 2~3문장)

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 절대 다른 텍스트 금지:
{
  "totalSales": number | null,
  "dailyAvgSales": number | null,
  "avgSpend": number | null,
  "totalTransactions": number | null,
  "dailyAvgTransactions": number | null,
  "operatingDays": number | null,
  "weekdayDays": number | null,
  "weekendDays": number | null,
  "weekendSalesRatio": number | null,
  "peakHour": string | null,
  "topMenus": string[] | null,
  "deliverySales": number | null,
  "cardSalesRatio": number | null,
  "dataStartDate": string | null,
  "dataEndDate": string | null,
  "analysisNote": string
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API 키가 설정되지 않았습니다." }), { status: 500 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: "AI 분석 중 오류가 발생했습니다." }), { status: 500 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    // truncated 여부를 응답에 포함 (클라이언트 경고 표시용)
    return new Response(JSON.stringify({ ...parsed, _truncated: truncated }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "응답 파싱 실패" }), { status: 500 });
  }
  } catch (e) {
    console.error("Parse excel error:", e);
    return new Response(JSON.stringify({ error: "서버 오류" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
