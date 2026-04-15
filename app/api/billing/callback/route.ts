import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { issueBillingKey, chargeBillingKey, getSubscriptionAmount, getOrderName, generateOrderId, calcNextPeriodEnd } from "@/lib/toss-billing";
import { sendWelcome } from "@/lib/subscription-email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const authKey = searchParams.get("authKey");
  const customerKey = searchParams.get("customerKey");
  const cycle = (searchParams.get("cycle") || "monthly") as "monthly" | "annual";

  if (!authKey || !customerKey) {
    return NextResponse.redirect(new URL("/payment/fail?reason=missing_params", origin));
  }

  // Supabase 클라이언트 (쿠키 기반)
  const response = NextResponse.redirect(new URL("/payment/success?subscription=true", origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // 1. 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL("/payment/fail?reason=auth_failed", origin));
    }

    // customerKey가 인증된 사용자와 일치하는지 검증
    if (customerKey !== user.id) {
      return NextResponse.redirect(new URL("/payment/fail?reason=customer_mismatch", origin));
    }

    // 2. 빌링키 발급
    const billing = await issueBillingKey(authKey, customerKey);
    const cardLast4 = billing.card.number.slice(-4);
    const cardCompany = billing.card.cardCompany;

    // 3. 첫 결제
    const amount = getSubscriptionAmount(cycle);
    const orderId = generateOrderId(cycle);
    const orderName = getOrderName(cycle);

    const chargeResult = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey,
      amount,
      orderId,
      orderName,
    });

    if (!chargeResult.success) {
      return NextResponse.redirect(new URL(`/payment/fail?reason=${encodeURIComponent(chargeResult.error || "charge_failed")}`, origin));
    }

    // 4. 구독 생성
    const now = new Date();
    const periodEnd = calcNextPeriodEnd(now, cycle);

    const { data: sub, error: subError } = await supabase.from("subscriptions").upsert({
      user_id: user.id,
      plan: "standard",
      billing_cycle: cycle,
      billing_key: billing.billingKey,
      card_last4: cardLast4,
      card_company: cardCompany,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      retry_count: 0,
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" }).select().single();

    if (subError) {
      console.error("Subscription insert error:", subError);
      // 한 번 더 시도
      const { data: sub2 } = await supabase.from("subscriptions").upsert({
        user_id: user.id, plan: "standard", billing_cycle: cycle,
        billing_key: billing.billingKey, card_last4: cardLast4, card_company: cardCompany,
        status: "active", current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false, retry_count: 0, updated_at: now.toISOString(),
      }, { onConflict: "user_id" }).select().single();
      if (sub2) Object.assign(sub ?? {}, sub2);
    }

    // 5. 결제 기록
    await supabase.from("payments").insert({
      user_id: user.id,
      plan: "standard",
      amount,
      status: "done",
      order_id: orderId,
      payment_key: chargeResult.data?.paymentKey,
      subscription_id: sub?.id,
      billing_cycle: cycle,
      is_renewal: false,
    });

    // 6. 프로필 업데이트
    await supabase.from("profiles").update({
      plan: "standard",
      plan_updated_at: now.toISOString(),
      plan_expires_at: periodEnd.toISOString(),
    }).eq("id", user.id);

    // 7. 이벤트 로그
    if (sub) {
      await supabase.from("subscription_events").insert({
        subscription_id: sub.id,
        user_id: user.id,
        event_type: "created",
        payment_key: chargeResult.data?.paymentKey,
        amount,
        metadata: { cycle, cardLast4, cardCompany },
      });
    }

    // 8. 환영 이메일
    const email = user.email;
    if (email) {
      const dateStr = periodEnd.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      sendWelcome(email, cycle === "annual" ? "프로 (연간)" : "프로 (월간)", amount, dateStr).catch(console.error);
    }

    return response;
  } catch (e) {
    console.error("Billing callback error:", e);
    return NextResponse.redirect(new URL(`/payment/fail?reason=${encodeURIComponent(String(e))}`, origin));
  }
}
