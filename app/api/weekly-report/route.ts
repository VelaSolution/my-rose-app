import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "weekly-report", limit: 2 });
    if (!rl.ok) return rateLimitResponse();

    const { secret } = await req.json();
    if (!secret || secret !== process.env.TOSS_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = now.toISOString().slice(0, 10);
    const lastWeek = weekAgo.toISOString().slice(0, 10);

    // 프로필 조회
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, store_name, plan");

    if (!profiles) return NextResponse.json({ ok: true, sent: 0 });

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      if (!profile.email) continue;

      const displayName = esc(profile.store_name || profile.full_name || "사장님");

      // AI가 주간 리포트 생성
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) continue;

      let weeklyTip = "이번 주에는 원가율을 점검해보세요. 제철 식재료로 전환하면 원가를 5~10% 절감할 수 있습니다.";

      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages: [{ role: "user", content: `외식업 사장님을 위한 이번 주 경영 팁 3가지를 한국어로 짧게 작성해주세요. 각 팁은 1~2문장으로, 실행 가능한 구체적 내용으로. 번호 매기지 말고 줄바꿈으로 구분.` }],
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          weeklyTip = data.content?.[0]?.text ?? weeklyTip;
        }
      } catch { /* fallback tip 사용 */ }

      const tips = weeklyTip.split("\n").filter((t: string) => t.trim()).slice(0, 3);

      const html = `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="color:#3182F6;font-size:20px;margin:0 0 4px;">VELA 주간 리포트</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 28px;">${lastWeek} ~ ${thisWeek} · ${displayName}</p>

    <h3 style="font-size:15px;color:#333;margin:0 0 12px;">이번 주 경영 팁</h3>
    <ul style="color:#555;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 28px;">
      ${tips.map((t: string) => `<li style="margin-bottom:8px;">${esc(t)}</li>`).join("")}
    </ul>

    <div style="text-align:center;">
      <a href="https://velaanalytics.com/dashboard"
         style="display:inline-block;padding:12px 32px;background:#3182F6;color:#fff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">
        대시보드 확인하기 →
      </a>
    </div>
  </div>
  <p style="text-align:center;margin-top:24px;color:#aaa;font-size:12px;">
    이 메일은 VELA에서 자동 발송된 주간 리포트입니다.
  </p>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "VELA 주간리포트 <contact@velaanalytics.com>",
          to: [profile.email],
          subject: `[VELA] ${displayName}, 이번 주 경영 팁이 도착했어요!`,
          html,
        }),
      });

      if (res.ok) sentCount++;
      else errors.push(profile.email);
    }

    return NextResponse.json({ ok: true, sent: sentCount, failed: errors.length });
  } catch (e) {
    console.error("Weekly report error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
