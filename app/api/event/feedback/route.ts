import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 분당 3회
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "event-feedback", limit: 3 });
    if (!rl.ok) return rateLimitResponse();

    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError("잘못된 요청입니다.", 400);
    }

    const {
      user_id,
      nickname,
      industry,
      experience,
      review,
      useful_features,
      improvement,
      pay_intent,
      phone,
      recommend_count,
      wanted_feature,
      testimonial,
    } = body;

    // 필수 항목 검증
    if (!nickname || !industry || !experience || !review || !improvement || !phone) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }
    if (typeof review === "string" && review.trim().length < 50) {
      return NextResponse.json({ error: "사용 소감을 50자 이상 작성해주세요." }, { status: 400 });
    }
    if (!Array.isArray(useful_features) || useful_features.length === 0) {
      return NextResponse.json({ error: "유용했던 기능을 1개 이상 선택해주세요." }, { status: 400 });
    }

    // 중복 제출 방지 (로그인 사용자)
    if (user_id) {
      const { data: existing } = await supabaseAdmin
        .from("event_feedback")
        .select("id")
        .eq("user_id", user_id)
        .limit(1);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "이미 피드백을 제출하셨습니다." }, { status: 409 });
      }
    }

    // 피드백 저장
    const { error: insertError } = await supabaseAdmin
      .from("event_feedback")
      .insert({
        user_id: user_id || null,
        nickname: String(nickname).slice(0, 50),
        industry: String(industry).slice(0, 20),
        experience: String(experience).slice(0, 20),
        review: String(review).slice(0, 2000),
        useful_features,
        improvement: String(improvement).slice(0, 2000),
        pay_intent: Math.min(Math.max(Number(pay_intent) || 3, 1), 5),
        phone: String(phone).slice(0, 13),
        recommend_count: recommend_count ? String(recommend_count).slice(0, 20) : null,
        wanted_feature: wanted_feature ? String(wanted_feature).slice(0, 200) : null,
        testimonial: testimonial ? String(testimonial).slice(0, 100) : null,
      });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return NextResponse.json({ error: "피드백 저장에 실패했습니다." }, { status: 500 });
    }

    // 로그인 사용자: 스탠다드 플랜 1개월 무료 체험 활성화
    if (user_id) {
      const trialExpiresAt = new Date();
      trialExpiresAt.setMonth(trialExpiresAt.getMonth() + 1);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: "standard",
          trial_expires_at: trialExpiresAt.toISOString(),
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("Plan upgrade error:", updateError);
        // 플랜 업그레이드 실패해도 피드백은 저장됨 — 응답에 경고 포함
        return NextResponse.json({
          ok: true,
          warning: "피드백은 저장되었으나 플랜 활성화에 실패했습니다. 고객센터에 문의해주세요.",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Event feedback error:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
