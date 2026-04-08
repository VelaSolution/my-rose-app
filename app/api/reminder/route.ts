import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/**
 * POST /api/reminder
 * 매출 미입력 유저에게 리마인더 이메일 발송 (관리자 전용)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "reminder", limit: 2 });
    if (!rl.ok) return rateLimitResponse();

    const { secret } = await req.json();
    if (!secret || secret !== process.env.TOSS_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 이번 달 스냅샷이 있는 유저 ID 조회
    const { data: snapsThisMonth } = await supabaseAdmin
      .from("monthly_snapshots")
      .select("user_id")
      .eq("month", currentMonth);

    const usersWithData = new Set((snapsThisMonth ?? []).map((s) => s.user_id));

    // 전체 활성 유저 조회 (이메일 있는 유저만)
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, store_name");

    if (!profiles) {
      return NextResponse.json({ ok: true, sent: 0, message: "프로필 없음" });
    }

    // 이번 달 데이터 미입력 유저 필터링
    const targets = profiles.filter(
      (p) => p.email && !usersWithData.has(p.id)
    );

    if (targets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "모든 유저가 데이터를 입력했습니다" });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of targets) {
      const displayName = esc(profile.store_name || profile.full_name || "사장님");
      const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

      const html = `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="color:#3182F6;font-size:20px;margin:0 0 8px;">VELA 매출 등록 리마인더</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${currentMonth} · ${displayName}</p>

    <div style="background:#fef3c7;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">📋</p>
      <p style="font-size:16px;font-weight:700;color:#92400e;margin:0 0 4px;">이번 달 매출이 아직 등록되지 않았어요</p>
      <p style="font-size:13px;color:#a16207;margin:0;">이번 달 마감까지 <strong>${daysLeft}일</strong> 남았습니다</p>
    </div>

    <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
      매출을 등록하면 월별 추이 분석, AI 브리핑, 경쟁 매장 비교 등 다양한 인사이트를 받아볼 수 있어요.
      지금 바로 등록해보세요!
    </p>

    <div style="text-align:center;">
      <a href="https://velaanalytics.com/monthly-input"
         style="display:inline-block;padding:14px 36px;background:#3182F6;color:#fff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">
        매출 등록하러 가기 →
      </a>
    </div>
  </div>
  <p style="text-align:center;margin-top:24px;color:#aaa;font-size:12px;">
    이 메일은 VELA에서 자동 발송된 리마인더입니다.
  </p>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "VELA 리마인더 <contact@velaanalytics.com>",
          to: [profile.email],
          subject: `[VELA] ${displayName}, 이번 달 매출을 등록해주세요!`,
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(`Reminder error for ${profile.email}:`, err);
        errors.push(profile.email);
      }
    }

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      skipped: usersWithData.size,
      failed: errors.length,
    });
  } catch (e) {
    console.error("Reminder error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
