import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
    }

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

    return NextResponse.json({ success: true, payment: tossData });
  } catch (e) {
    console.error("Payment confirm error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
