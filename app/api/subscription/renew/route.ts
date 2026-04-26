import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chargeBillingKey, getSubscriptionAmount, getOrderName, generateOrderId, calcNextPeriodEnd } from "@/lib/toss-billing";
import { sendExpired } from "@/lib/subscription-email";

export const dynamic = "force-dynamic";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 개발 환경에서는 통과
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) return apiError("Unauthorized", 401);

  const admin = supabaseAdmin;
  const now = new Date();
  let renewed = 0, expired = 0, failed = 0;

  // 1. 자동 갱신 대상 (active + 만료됨 + 취소 안 함)
  const { data: dueSubscriptions } = await admin
    .from("subscriptions")
    .select("*, profiles!inner(email)")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .lte("current_period_end", now.toISOString());

  for (const sub of dueSubscriptions ?? []) {
    const cycle = sub.billing_cycle as "monthly" | "annual";
    const amount = getSubscriptionAmount(cycle);
    const orderId = generateOrderId(cycle, true);
    const orderName = getOrderName(cycle);

    const result = await chargeBillingKey({
      billingKey: sub.billing_key,
      customerKey: sub.user_id,
      amount,
      orderId,
      orderName,
    });

    if (result.success) {
      const newStart = new Date(sub.current_period_end);
      const newEnd = calcNextPeriodEnd(newStart, cycle);

      // DB 업데이트 — 실패 시 이중 결제 방지를 위해 반드시 확인
      const { error: updateErr } = await admin.from("subscriptions").update({
        current_period_start: newStart.toISOString(),
        current_period_end: newEnd.toISOString(),
        retry_count: 0,
        updated_at: now.toISOString(),
      }).eq("id", sub.id);

      if (updateErr) {
        console.error("CRITICAL: charge succeeded but subscription update failed", { subId: sub.id, error: updateErr });
        // 결제는 됐지만 DB 반영 실패 — 관리자 알림 필요
        failed++;
        continue;
      }

      await admin.from("profiles").update({
        plan_expires_at: newEnd.toISOString(),
      }).eq("id", sub.user_id);

      await admin.from("payments").insert({
        user_id: sub.user_id,
        plan: sub.plan,
        amount,
        status: "done",
        order_id: orderId,
        payment_key: result.data?.paymentKey,
        subscription_id: sub.id,
        billing_cycle: cycle,
        is_renewal: true,
      });

      await admin.from("subscription_events").insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        event_type: "renewed",
        payment_key: result.data?.paymentKey,
        amount,
      });

      renewed++;
    } else {
      await admin.from("subscriptions").update({
        status: "past_due",
        retry_count: 1,
        updated_at: now.toISOString(),
      }).eq("id", sub.id);

      // 결제 실패 시 plan_expires_at을 3일 뒤로 설정 (재시도 기간 유예)
      const graceEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await admin.from("profiles").update({
        plan_expires_at: graceEnd.toISOString(),
      }).eq("id", sub.user_id);

      await admin.from("subscription_events").insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        event_type: "payment_failed",
        metadata: { error: result.error, code: result.code },
      });

      failed++;
    }
  }

  // 2. 취소 후 만료 대상 (cancel_at_period_end=true + 만료됨)
  const { data: cancelledDue } = await admin
    .from("subscriptions")
    .select("*, profiles!inner(email)")
    .eq("cancel_at_period_end", true)
    .in("status", ["active", "cancelled"])
    .lte("current_period_end", now.toISOString());

  for (const sub of cancelledDue ?? []) {
    await admin.from("subscriptions").update({
      status: "expired",
      updated_at: now.toISOString(),
    }).eq("id", sub.id);

    await admin.from("profiles").update({
      plan: "free",
      plan_expires_at: null,
    }).eq("id", sub.user_id);

    await admin.from("subscription_events").insert({
      subscription_id: sub.id,
      user_id: sub.user_id,
      event_type: "expired",
    });

    const email = (sub as any).profiles?.email;
    if (email) sendExpired(email).catch(console.error);

    expired++;
  }

  return apiSuccess({ renewed, expired, failed, timestamp: now.toISOString() });
}
