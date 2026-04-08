import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const industryLabels: Record<string, string> = {
  cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "anon-ai-reply", limit: 5 });
    if (!rl.ok) return rateLimitResponse();
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: "postId 필요" }, { status: 400 });

    // 이미 AI 답변이 있는지 확인
    const { data: existing } = await supabaseAdmin
      .from("anonymous_comments")
      .select("id")
      .eq("post_id", postId)
      .eq("is_ai", true)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 게시글 조회
    const { data: post } = await supabaseAdmin
      .from("anonymous_posts")
      .select("title, content, industry")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: "게시글 없음" }, { status: 404 });

    const systemPrompt = `당신은 VELA의 외식업 전문 경영 컨설턴트 AI입니다.
외식업 사장님의 익명 고민 상담에 답변합니다.
업종: ${industryLabels[post.industry ?? ""] ?? "외식업"}

답변 규칙:
1. 먼저 사장님의 상황에 공감하는 문장으로 시작하세요.
2. 문제의 핵심 원인을 짚어주세요.
3. 실행 가능한 구체적 해결책을 2~3가지 제안하세요.
4. 격려와 응원으로 마무리하세요.
5. 답변은 반드시 완결된 문장으로 끝내세요. 중간에 끊기지 않도록 하세요.

수치가 없어도 일반적인 경영 원칙과 실무 경험을 바탕으로 도움이 되는 답변을 해주세요.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API 키 없음" }, { status: 500 });

    // 비스트리밍으로 완전한 답변 받기
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: `${post.title}\n\n${post.content}` }],
      }),
    });

    if (!res.ok) {
      console.error("AI reply error:", await res.text());
      return NextResponse.json({ error: "AI 응답 실패" }, { status: 500 });
    }

    const data = await res.json();
    const aiText = data.content?.[0]?.text ?? "";

    if (!aiText.trim()) {
      return NextResponse.json({ error: "빈 응답" }, { status: 500 });
    }

    // DB에 저장
    await supabaseAdmin.from("anonymous_comments").insert({
      post_id: postId,
      content: aiText,
      is_ai: true,
    });

    // comment_count 업데이트
    const { data: allComments } = await supabaseAdmin
      .from("anonymous_comments")
      .select("id")
      .eq("post_id", postId);
    await supabaseAdmin
      .from("anonymous_posts")
      .update({ comment_count: allComments?.length ?? 1 })
      .eq("id", postId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Anon AI reply error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
