import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { key: "briefing", limit: 5 });
  if (!rl.ok) return rateLimitResponse();
  const body = await req.json().catch(() => null);
  if (!body?.form || !body?.result) {
    return apiError("입력값이 올바르지 않습니다.", 400);
  }
  const { form, result } = body;

  const industryLabels: Record<string, string> = {
    cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };
  const label = industryLabels[form.industry] ?? "음식점";

  const deliveryConstraint = form.deliveryPreference === "impossible"
    ? "\n⚠️ 중요 제약: 이 매장은 배달 운영 의사가 없습니다. 배달 관련 전략(배달앱 입점, 배달 채널 추가 등)은 절대 제안하지 마세요."
    : "";

  const prompt = `당신은 외식업 전문 경영 컨설턴트입니다. 아래 매장 수치를 보고 "오늘의 경영 브리핑"을 작성하세요.
브리핑은 대표가 아침에 30초 만에 읽고 판단할 수 있도록 간결하고 핵심적이어야 합니다.
AI 전략 추천과는 다릅니다 — 브리핑은 "현재 상태 진단 + 가장 급한 것 1개"에 집중하세요.${deliveryConstraint}

[기본 정보]
업종: ${label} / ${form.businessType === "new" ? "창업 예정" : "현재 운영 중"}
좌석 수: ${form.seats}석 / 객단가: ${Number(form.avgSpend).toLocaleString("ko-KR")}원 / 회전율: ${form.turnover}회
영업일: 평일 ${form.weekdayDays}일 + 주말 ${form.weekendDays}일 (주말 배율 ${form.weekendMultiplier}x)
배달 운영: ${form.deliveryEnabled ? `있음 (월 ${Number(form.deliverySales).toLocaleString("ko-KR")}원)` : "없음"}

[매출 현황]
홀 매출: ${Number(result.hallSales).toLocaleString("ko-KR")}원
배달 순매출: ${Number(result.deliveryNetSales).toLocaleString("ko-KR")}원
총 매출: ${Number(result.totalSales).toLocaleString("ko-KR")}원

[비용 구조]
인건비: ${Number(result.laborCost).toLocaleString("ko-KR")}원 (비율 ${result.laborRatio.toFixed(1)}%)
원가율: ${form.cogsRate}% / 카드수수료: ${form.cardFeeRate}%
임대료: ${Number(form.rent).toLocaleString("ko-KR")}원 / 공과금: ${Number(form.utilities).toLocaleString("ko-KR")}원
마케팅: ${Number(form.marketing).toLocaleString("ko-KR")}원 / 기타: ${Number(form.etc).toLocaleString("ko-KR")}원

[수익 현황]
세전 순이익: ${Number(result.profit).toLocaleString("ko-KR")}원 (순이익률 ${result.netMargin.toFixed(1)}%)
세후 실수령: ${Number(result.netProfit).toLocaleString("ko-KR")}원
현금흐름 (대출상환 후): ${Number(result.cashFlow).toLocaleString("ko-KR")}원
손익분기점: ${Number(result.bep).toLocaleString("ko-KR")}원 (${result.bepGap >= 0 ? "달성" : "미달"})

[초기비용 & 부채]
총 초기 투자비: ${Number(result.totalInitialCost).toLocaleString("ko-KR")}원
월 대출상환: ${Number(result.monthlyLoanPayment).toLocaleString("ko-KR")}원
투자금 회수 예상: ${result.recoveryMonthsActual === 999 ? "불가" : `${result.recoveryMonthsActual}개월`} (목표 ${form.recoveryMonths}개월)

다음 4가지를 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트 절대 금지:
{
  "currentStatus": "현재 상태를 1~2문장으로 요약. 흑자/적자, 현금흐름 위주. 숫자 포함.",
  "mainIssue": "지금 가장 급한 문제 1가지만. 구체적 수치로. 1~2문장.",
  "topAction": "오늘 당장 할 수 있는 액션 1가지. 10글자 이내로 짧게.",
  "actionHint": "이번 주 체크할 것 1가지. 10글자 이내."
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return apiError("API 키가 설정되지 않았습니다.", 500);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return apiError("AI 분석 중 오류가 발생했습니다.", 500);

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return apiSuccess(parsed);
  } catch {
    return apiError("응답 파싱에 실패했습니다.", 500);
  }
  } catch (e) {
    console.error("Briefing error:", e);
    return apiError("서버 오류", 500);
  }
}
