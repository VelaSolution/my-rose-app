import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "delivery-analysis", limit: 5 });
    if (!rl.ok) return rateLimitResponse();

    const body = await req.json().catch(() => null);
    if (!body?.csvText) {
      return apiError("데이터 없음", 400);
    }

    const { csvText, platform, fileName } = body;
    const safeCsv = String(csvText).slice(0, 10000);

    const platformLabel: Record<string, string> = { baemin: "배달의민족", coupang: "쿠팡이츠", yogiyo: "요기요" };

    const prompt = `당신은 배달앱 정산 데이터 분석 전문가입니다.
아래는 ${platformLabel[platform] ?? "배달앱"} 정산서 파일(${fileName ?? "data"})의 텍스트 변환 내용입니다.

[정산 데이터]
${safeCsv}

위 데이터를 분석해서 아래 항목을 추출하세요.
데이터가 없거나 불확실한 항목은 null로 반환하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "totalOrders": number | null,
  "totalSales": number | null,
  "totalFees": number | null,
  "netSales": number | null,
  "avgOrderAmount": number | null,
  "feeRate": number | null,
  "profitPerOrder": number | null,
  "peakDay": string | null,
  "topMenus": string[] | null,
  "summary": "한국어 3~5문장. 수수료 부담, 건당 수익성, 개선 포인트를 구체적으로."
}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return apiError("API 키가 설정되지 않았습니다.", 500);

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
      return apiError("AI 서비스 연결 실패", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return apiError("AI 분석 실패", 500);

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return apiSuccess(parsed);
  } catch (e) {
    console.error("Delivery analysis error:", e);
    return apiError("서버 오류", 500);
  }
}
