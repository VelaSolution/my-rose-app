// app/api/tools/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

// 간단한 rate limiting (IP 기반, 분당 10회)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // 로그인 확인
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { prompt?: unknown; systemPrompt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { prompt, systemPrompt } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const safeSystem = typeof systemPrompt === "string" && systemPrompt.trim()
    ? systemPrompt.slice(0, 1000)
    : "당신은 외식업 전문 마케터이자 경영 컨설턴트입니다. 사용자의 요청에 맞게 실용적이고 구체적으로 답변하세요.";

  // prompt injection 방어 - 시스템 명령어 패턴 제거
  const safePrompt = prompt
    .slice(0, 4000)
    .replace(/ignore (previous|above|all) instructions?/gi, "")
    .replace(/you are now/gi, "")
    .replace(/act as/gi, "");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: safeSystem,
      messages: [{ role: "user", content: safePrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown");
    console.error("Anthropic error:", response.status, err);
    return NextResponse.json({ error: "AI 응답 중 오류가 발생했습니다." }, { status: 500 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  return NextResponse.json({ text });
}

