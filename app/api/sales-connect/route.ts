import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

type Platform = "baemin" | "coupang" | "yogiyo" | "pos";

const PLATFORM_LABELS: Record<Platform, string> = {
  baemin: "배달의민족",
  coupang: "쿠팡이츠",
  yogiyo: "요기요",
  pos: "POS",
};

const MAX_CSV_ROWS = 300;
const MAX_CSV_CHARS = 10000;

function truncateCsvSafely(csvText: string): { text: string; truncated: boolean } {
  const lines = csvText.split("\n");
  if (lines.length <= MAX_CSV_ROWS && csvText.length <= MAX_CSV_CHARS) {
    return { text: csvText, truncated: false };
  }
  const rowLimited = lines.slice(0, MAX_CSV_ROWS).join("\n");
  const result = rowLimited.length > MAX_CSV_CHARS ? rowLimited.slice(0, MAX_CSV_CHARS) : rowLimited;
  return { text: result, truncated: true };
}

function buildPrompt(platform: Platform, csvText: string, fileName: string, truncated: boolean): string {
  const truncNote = truncated
    ? `\n(주의: 데이터가 방대하여 상위 ${MAX_CSV_ROWS}행만 분석합니다. 결과가 부분적일 수 있습니다.)`
    : "";

  const isDelivery = platform !== "pos";

  if (isDelivery) {
    return `당신은 배달앱 정산·매출 데이터 분석 전문가입니다.
아래는 ${PLATFORM_LABELS[platform]} 정산서/매출 파일(${fileName})의 텍스트 변환 내용입니다.${truncNote}

[데이터]
${csvText}

위 데이터를 분석해서 아래 항목을 추출하세요.
데이터가 없거나 불확실한 항목은 null로 반환하세요.
금액은 반드시 숫자(원 단위)로만 반환하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트 금지:
{
  "totalSales": number | null,
  "totalOrders": number | null,
  "totalFees": number | null,
  "netSales": number | null,
  "avgOrderAmount": number | null,
  "feeRate": number | null,
  "deliverySales": number | null,
  "peakDay": string | null,
  "topMenus": string[] | null,
  "dataStartDate": "YYYY-MM-DD" | null,
  "dataEndDate": "YYYY-MM-DD" | null,
  "summary": "한국어 3~5문장. 매출 규모, 수수료 부담, 건당 수익성, 개선 포인트를 구체적으로."
}`;
  }

  return `당신은 POS 매출 데이터 분석 전문가입니다.
아래는 POS에서 추출한 파일(${fileName})의 텍스트 변환 내용입니다.${truncNote}

[POS 데이터]
${csvText}

위 데이터를 분석해서 아래 항목을 추출하세요.
데이터가 없거나 불확실한 항목은 null로 반환하세요.
금액은 반드시 숫자(원 단위)로만 반환하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트 금지:
{
  "totalSales": number | null,
  "totalOrders": number | null,
  "dailyAvgSales": number | null,
  "avgSpend": number | null,
  "operatingDays": number | null,
  "peakHour": string | null,
  "topMenus": string[] | null,
  "deliverySales": number | null,
  "cardSalesRatio": number | null,
  "dataStartDate": "YYYY-MM-DD" | null,
  "dataEndDate": "YYYY-MM-DD" | null,
  "summary": "한국어 3~5문장. 매출 추이, 객단가, 피크 시간대, 개선 포인트를 구체적으로."
}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "sales-connect", limit: 5 });
    if (!rl.ok) return rateLimitResponse();

    const body = await req.json().catch(() => null);
    if (!body?.csvText) {
      return new Response(JSON.stringify({ error: "데이터 없음" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { csvText, platform, fileName } = body;
    const validPlatforms: Platform[] = ["baemin", "coupang", "yogiyo", "pos"];
    const safePlatform: Platform = validPlatforms.includes(platform) ? platform : "pos";

    const { text: safeCsv, truncated } = truncateCsvSafely(String(csvText));
    const prompt = buildPrompt(safePlatform, safeCsv, fileName ?? "data", truncated);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "API 키 없음" }), { status: 500 });

    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 30000);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch {
      clearTimeout(timeout);
      return new Response(JSON.stringify({ error: "AI 서비스 연결 실패" }), { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return new Response(JSON.stringify({ error: "AI 분석 실패" }), { status: 500 });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return new Response(JSON.stringify({ ...parsed, _platform: safePlatform, _truncated: truncated }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "응답 파싱 실패" }), { status: 500 });
    }
  } catch (e) {
    console.error("Sales connect error:", e);
    return new Response(JSON.stringify({ error: "서버 오류" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
