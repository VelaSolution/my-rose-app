import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

const VALID_INDUSTRIES = ["cafe", "restaurant", "bar", "finedining", "gogi"];

export async function POST(req: NextRequest) {
  try {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { key: "ai-strategy", limit: 5 });
  if (!rl.ok) return rateLimitResponse();
  const body = await req.json().catch(() => null);
  if (!body?.form || !body?.result) {
    return apiError("입력값 누락", 400);
  }
  const { form, result, existingStrategies } = body;

  // 서버 측 입력값 검증
  if (!form || typeof form !== "object") {
    return apiError("잘못된 요청입니다.", 400);
  }
  if (!VALID_INDUSTRIES.includes(form.industry)) {
    return apiError("유효하지 않은 업종입니다.", 400);
  }
  if (typeof result?.totalSales !== "number" || typeof result?.profit !== "number") {
    return apiError("결과 데이터가 올바르지 않습니다.", 400);
  }

  const industryLabels: Record<string, string> = {
    cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };
  const label = industryLabels[form.industry] ?? "음식점";

  // 기존 전략 목록 — 최대 10개만 허용 (프롬프트 폭발 방지)
  const safeExisting = Array.isArray(existingStrategies)
    ? existingStrategies.slice(0, 10)
    : [];

  const existingList = safeExisting
    .map((s: { label: string; diff: number }) => `- ${String(s.label).slice(0, 30)} → 순이익 +${Number(s.diff).toLocaleString("ko-KR")}원`)
    .join("\n");

  const deliveryConstraint = form.deliveryPreference === "impossible"
    ? "\n⚠️ 중요 제약: 이 매장은 배달 운영 의사가 없습니다. 배달 관련 전략(배달앱 입점, 배달 채널 추가 등)은 절대 제안하지 마세요."
    : "";

  const prompt = `당신은 외식업 전문 경영 컨설턴트입니다.
아래 매장 데이터와 기존 시뮬레이션 전략을 참고해, 기존에 없는 새로운 관점의 전략 3가지를 추가로 제안하세요.${deliveryConstraint}

[매장 현황]
업종: ${label} / ${form.businessType === "new" ? "창업 예정" : "운영 중"}
좌석: ${Number(form.seats)}석 / 객단가: ${Number(form.avgSpend).toLocaleString("ko-KR")}원 / 회전율: ${Number(form.turnover)}회
영업일: 평일 ${Number(form.weekdayDays)}일 + 주말 ${Number(form.weekendDays)}일 (주말 배율 ${Number(form.weekendMultiplier)}x)
배달 운영: ${form.deliveryEnabled ? `있음 (월 ${Number(form.deliverySales).toLocaleString("ko-KR")}원)` : "없음"}

[수익 현황]
월 총 매출: ${Number(result.totalSales).toLocaleString("ko-KR")}원
세전 순이익: ${Number(result.profit).toLocaleString("ko-KR")}원 (순이익률 ${Number(result.netMargin)?.toFixed(1)}%)
세후 실수령: ${Number(result.netProfit).toLocaleString("ko-KR")}원
현금흐름: ${Number(result.cashFlow).toLocaleString("ko-KR")}원
인건비 비율: ${Number(result.laborRatio)?.toFixed(1)}% / 원가율: ${Number(result.cogsRatio)?.toFixed(1)}%
손익분기점: ${Number(result.bep).toLocaleString("ko-KR")}원 (${result.bepGap >= 0 ? "달성" : "미달"})
투자금 회수: ${result.recoveryMonthsActual === 999 ? "불가" : `${result.recoveryMonthsActual}개월 예상`}

[이미 제안된 전략 — 겹치지 않게 새로운 전략을 제안하세요]
${existingList || "(없음)"}

[요청]
위 데이터를 바탕으로, 기존 전략과 겹치지 않는 창의적이고 실행 가능한 전략 3가지를 제안하세요.
수치 변경(객단가, 회전율, 인건비)이 아닌 운영 방식, 마케팅, 메뉴 구성, 시간대 활용 등 다양한 관점에서 제안하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트 절대 금지:
{
  "strategies": [
    {
      "title": "전략명 (10자 이내)",
      "description": "실행 방법과 기대 효과 (2~3문장, 구체적으로)",
      "difficulty": "쉬움 또는 보통 또는 어려움",
      "category": "메뉴 또는 마케팅 또는 운영 또는 공간 또는 고객관리 중 하나"
    }
  ]
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return apiError("API 키가 설정되지 않았습니다.", 500);
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
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return apiError("AI 전략 생성 중 오류가 발생했습니다.", 500);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // 클라이언트 측 중복 방지를 위해 제목(title) 목록도 함께 반환
    if (Array.isArray(parsed.strategies)) {
      parsed._titles = parsed.strategies.map((s: { title: string }) => s.title);
    }

    return apiSuccess(parsed);
  } catch {
    return apiError("응답 파싱에 실패했습니다.", 500);
  }
  } catch (e) {
    console.error("AI strategy error:", e);
    return apiError("서버 오류", 500);
  }
}
