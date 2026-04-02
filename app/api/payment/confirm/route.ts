import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** orderId 형식: VELA-{planId}-{timestamp} */
function parsePlan(orderId: string): string {
  const parts = orderId.split("-");
  return parts.length >= 2 ? parts[1] : "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
    }

    /* ── 1. 토스 결제 승인 ── */
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");

    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error("Toss error:", tossData);
      return NextResponse.json(
        { error: tossData.message || "결제 승인 실패" },
        { status: tossRes.status }
      );
    }

    /* ── 2. 인증된 사용자 확인 ── */
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error after payment:", authError);
      return NextResponse.json(
        { error: "사용자 인증 실패. 결제는 완료되었으나 플랜 반영에 실패했습니다." },
        { status: 401 }
      );
    }

    /* ── 3. payments 테이블에 결제 내역 저장 ── */
    const plan = parsePlan(orderId);

    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      plan,
      amount: Number(amount),
      status: "done",
      payment_key: paymentKey,
      order_id: orderId,
    });

    if (insertError) {
      console.error("Payment insert error:", insertError);
      // 결제는 성공했으므로 에러를 삼키지 않되, 사용자에게 알림
      return NextResponse.json({
        success: true,
        payment: tossData,
        warning: "결제는 완료되었으나 내역 저장에 실패했습니다. 고객센터에 문의해주세요.",
      });
    }

    /* ── 4. profiles 테이블의 plan 필드 업데이트 ── */
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile plan update error:", updateError);
      // payments에는 저장됐으므로 치명적이지 않음
    }

    return NextResponse.json({ success: true, payment: tossData });
  } catch (e) {
    console.error("Payment confirm error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
