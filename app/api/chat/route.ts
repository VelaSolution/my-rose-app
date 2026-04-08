import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { key: "chat", limit: 10 });
  if (!rl.ok) return rateLimitResponse();
  const body = await req.json();
  const { messages, context } = body;

  // 입력값 검증
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "메시지가 없습니다." }), { status: 400 });
  }
  if (messages.length > 100) {
    return new Response(JSON.stringify({ error: "대화가 너무 깁니다." }), { status: 400 });
  }

  const industryLabels: Record<string, string> = {
    cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };

  // 익명 상담 전용 프롬프트
  const anonymousPrompt = `당신은 VELA의 외식업 전문 경영 컨설턴트 AI입니다.
외식업 사장님의 익명 고민 상담에 답변합니다.
업종: ${industryLabels[context?.industry ?? ""] ?? "외식업"}

답변 규칙:
1. 먼저 사장님의 상황에 공감하는 문장으로 시작하세요.
2. 문제의 핵심 원인을 짚어주세요.
3. 실행 가능한 구체적 해결책을 2~3가지 제안하세요.
4. 격려와 응원으로 마무리하세요.
5. 답변은 반드시 완결된 문장으로 끝내세요. 중간에 끊기지 않도록 하세요.

수치가 없어도 일반적인 경영 원칙과 실무 경험을 바탕으로 도움이 되는 답변을 해주세요.`;

  const deliveryConstraint = context?.form?.deliveryPreference === "impossible"
    ? "\n⚠️ 이 매장은 배달 운영 의사가 없습니다. 배달 관련 전략은 절대 추천하지 마세요."
    : "";

  const systemPrompt = context?.isAnonymousConsult
    ? anonymousPrompt
    : context?.form
    ? `당신은 VELA의 외식업 전문 경영 컨설턴트 AI입니다. 
사용자의 매장 데이터를 기반으로 실용적이고 구체적인 조언을 제공하세요.
친절하고 명확하게 답변하되, 전문 용어는 쉽게 풀어서 설명하세요.
답변은 간결하게 3~5문장 이내로 유지하세요.${deliveryConstraint}

[현재 매장 데이터]
업종: ${industryLabels[context.form?.industry] ?? "음식점"} (${context.form?.businessType === "new" ? "창업 예정" : "운영 중"})
좌석: ${context.form?.seats}석 / 객단가: ${Number(context.form?.avgSpend ?? 0).toLocaleString("ko-KR")}원 / 회전율: ${context.form?.turnover}회
영업일: 평일 ${context.form?.weekdayDays}일 + 주말 ${context.form?.weekendDays}일

[월 수익 현황]
총 매출: ${Number(context.result?.totalSales ?? 0).toLocaleString("ko-KR")}원
세전 순이익: ${Number(context.result?.profit ?? 0).toLocaleString("ko-KR")}원 (순이익률 ${context.result?.netMargin?.toFixed(1)}%)
세후 실수령: ${Number(context.result?.netProfit ?? 0).toLocaleString("ko-KR")}원
현금흐름: ${Number(context.result?.cashFlow ?? 0).toLocaleString("ko-KR")}원
손익분기점: ${Number(context.result?.bep ?? 0).toLocaleString("ko-KR")}원 (${(context.result?.bepGap ?? 0) >= 0 ? "달성" : "미달"})
인건비 비율: ${context.result?.laborRatio?.toFixed(1)}%
원가율: ${context.result?.cogsRatio?.toFixed(1)}%
투자금 회수: ${context.result?.recoveryMonthsActual === 999 ? "불가" : `${context.result?.recoveryMonthsActual}개월 예상`}`
    : `당신은 VELA의 외식업 전문 경영 컨설턴트 AI입니다. 외식업 창업과 운영에 관한 질문에 친절하고 실용적으로 답변하세요. 답변은 3~5문장 이내로 간결하게 유지하세요.`;

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
      // 제거: "anthropic-beta": "messages-2023-12-15" — 존재하지 않는 베타 헤더
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: context?.isAnonymousConsult ? 2048 : 1024,
      system: systemPrompt,
      stream: true,
      messages: messages
        .slice(-50) // 최근 50개만 전송 (컨텍스트 폭발 방지)
        .map((m: { role: string; content: string }) => ({
          role: m.role,
          content: String(m.content).slice(0, 2000), // 메시지당 최대 2000자
        })),
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: "AI 응답 중 오류가 발생했습니다." }), { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) { controller.close(); return; }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                controller.enqueue(new TextEncoder().encode(parsed.delta.text));
              }
            } catch { /* skip */ }
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
