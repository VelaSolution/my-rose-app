import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/newsletter
 * 월간 리포트 이메일 발송 (관리자 전용)
 * body: { secret: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();

    if (secret !== process.env.TOSS_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ── 이번 달 / 지난 달 계산 ── */
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    /* ── 이번 달 스냅샷이 있는 유저 조회 ── */
    const { data: snapshots, error: snapErr } = await supabaseAdmin
      .from("monthly_snapshots")
      .select("user_id, month, monthly_sales, profit, net_margin, industry")
      .in("month", [thisMonth, lastMonth])
      .order("month", { ascending: false });

    if (snapErr) {
      console.error("Snapshot query error:", snapErr);
      return NextResponse.json({ error: "DB 조회 실패", detail: snapErr.message }, { status: 500 });
    }

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "발송 대상 없음" });
    }

    /* ── 유저별로 이번 달 / 지난 달 데이터 그룹핑 ── */
    const userMap = new Map<
      string,
      { thisMonth?: (typeof snapshots)[number]; lastMonth?: (typeof snapshots)[number] }
    >();

    for (const s of snapshots) {
      const entry = userMap.get(s.user_id) ?? {};
      if (s.month === thisMonth) entry.thisMonth = s;
      if (s.month === lastMonth) entry.lastMonth = s;
      userMap.set(s.user_id, entry);
    }

    // 이번 달 데이터가 있는 유저만 대상
    const targetUserIds = [...userMap.entries()]
      .filter(([, v]) => v.thisMonth)
      .map(([id]) => id);

    if (targetUserIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "이번 달 데이터가 있는 유저 없음" });
    }

    /* ── 프로필에서 이메일 조회 ── */
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, store_name")
      .in("id", targetUserIds);

    if (profErr) {
      console.error("Profile query error:", profErr);
      return NextResponse.json({ error: "프로필 조회 실패", detail: profErr.message }, { status: 500 });
    }

    /* ── 이메일 발송 ── */
    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;

      const data = userMap.get(profile.id);
      if (!data?.thisMonth) continue;

      const curr = data.thisMonth;
      const prev = data.lastMonth;

      const salesNow = curr.monthly_sales ?? 0;
      const salesPrev = prev?.monthly_sales ?? 0;
      const profitNow = curr.profit ?? 0;
      const marginNow = curr.net_margin ?? 0;

      const growthRate =
        salesPrev > 0 ? Math.round(((salesNow - salesPrev) / salesPrev) * 1000) / 10 : null;
      const growthLabel =
        growthRate !== null
          ? growthRate >= 0
            ? `+${growthRate}%`
            : `${growthRate}%`
          : "비교 데이터 없음";
      const growthColor = growthRate !== null && growthRate >= 0 ? "#16a34a" : "#dc2626";

      const displayName = profile.store_name || profile.full_name || "사장님";

      const tips = generateTips(marginNow, growthRate);

      const html = buildEmailHtml({
        displayName,
        month: thisMonth,
        salesNow,
        salesPrev,
        profitNow,
        marginNow,
        growthLabel,
        growthColor,
        tips,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "VELA 월간리포트 <contact@velaanalytics.com>",
          to: [profile.email],
          subject: `[VELA] ${thisMonth} 월간 매출 리포트 — ${displayName}`,
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(`Resend error for ${profile.email}:`, err);
        errors.push(profile.email);
      }
    }

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      failed: errors.length,
      ...(errors.length > 0 && { failedEmails: errors }),
    });
  } catch (e) {
    console.error("Newsletter error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

/* ── 팁 생성 ── */
function generateTips(margin: number, growth: number | null): string[] {
  const tips: string[] = [];

  if (margin < 10) {
    tips.push("순이익률이 10% 미만입니다. 원가율 또는 고정비를 점검해 보세요.");
  } else if (margin >= 20) {
    tips.push("순이익률 20% 이상 — 훌륭합니다! 재투자 시점을 고려해 보세요.");
  } else {
    tips.push("안정적인 수익 구조입니다. 매출 확대에 집중해 보세요.");
  }

  if (growth !== null) {
    if (growth < -5) {
      tips.push("매출이 감소 추세입니다. 마케팅 또는 메뉴 개편을 검토해 보세요.");
    } else if (growth > 10) {
      tips.push("높은 성장률! 인력과 재고 관리에 신경 써 보세요.");
    }
  }

  tips.push("VELA 시뮬레이터로 다음 달 시나리오를 미리 분석해 보세요.");
  return tips;
}

/* ── HTML 빌더 ── */
function buildEmailHtml(p: {
  displayName: string;
  month: string;
  salesNow: number;
  salesPrev: number;
  profitNow: number;
  marginNow: number;
  growthLabel: string;
  growthColor: string;
  tips: string[];
}): string {
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  const tipsHtml = p.tips
    .map((t) => `<li style="margin-bottom:8px;">${t}</li>`)
    .join("");

  return `
<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="color:#3182F6;font-size:22px;margin:0 0 4px;">VELA 월간 리포트</h1>
    <p style="color:#888;font-size:14px;margin:0 0 24px;">${p.month} · ${p.displayName}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:14px;background:#f1f5f9;border-radius:8px 0 0 0;text-align:center;width:33%;">
          <div style="color:#666;font-size:12px;margin-bottom:4px;">이번 달 매출</div>
          <div style="font-size:18px;font-weight:700;">${fmt(p.salesNow)}원</div>
        </td>
        <td style="padding:14px;background:#f1f5f9;text-align:center;width:33%;">
          <div style="color:#666;font-size:12px;margin-bottom:4px;">순이익</div>
          <div style="font-size:18px;font-weight:700;">${fmt(p.profitNow)}원</div>
        </td>
        <td style="padding:14px;background:#f1f5f9;border-radius:0 8px 0 0;text-align:center;width:33%;">
          <div style="color:#666;font-size:12px;margin-bottom:4px;">성장률</div>
          <div style="font-size:18px;font-weight:700;color:${p.growthColor};">${p.growthLabel}</div>
        </td>
      </tr>
      ${
        p.salesPrev > 0
          ? `<tr>
        <td colspan="3" style="padding:10px 14px;background:#f8fafc;border-radius:0 0 8px 8px;color:#888;font-size:13px;">
          지난 달 매출: ${fmt(p.salesPrev)}원 · 순이익률: ${p.marginNow}%
        </td>
      </tr>`
          : ""
      }
    </table>

    <h3 style="font-size:15px;color:#333;margin:0 0 12px;">💡 이번 달 팁</h3>
    <ul style="color:#555;font-size:14px;line-height:1.7;padding-left:20px;margin:0 0 28px;">
      ${tipsHtml}
    </ul>

    <div style="text-align:center;">
      <a href="https://velaanalytics.com/dashboard"
         style="display:inline-block;padding:12px 32px;background:#3182F6;color:#fff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">
        대시보드에서 자세히 보기 →
      </a>
    </div>
  </div>

  <p style="text-align:center;margin-top:24px;color:#aaa;font-size:12px;">
    이 메일은 VELA에서 자동 발송된 월간 리포트입니다.<br/>
    수신 거부를 원하시면 대시보드 설정에서 변경해 주세요.
  </p>
</div>`;
}
