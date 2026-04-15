import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chargeBillingKey, getSubscriptionAmount, getOrderName, generateOrderId, calcNextPeriodEnd } from "@/lib/toss-billing";
import { sendPaymentFailed, sendExpired } from "@/lib/subscription-email";

export const dynamic = "force-dynamic";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) return apiError("Unauthorized", 401);

  const admin = supabaseAdmin;
  const now = new Date();
  let retried = 0, downgraded = 0;

  const { data: pastDue } = await admin
    .from("subscriptions")
    .select("*, profiles!inner(email)")
    .eq("status", "past_due")
    .lt("retry_count", 3);

  for (const sub of pastDue ?? []) {
    const cycle = sub.billing_cycle as "monthly" | "annual";
    const amount = getSubscriptionAmount(cycle);
    const orderId = generateOrderId(cycle, true);

    const result = await chargeBillingKey({
      billingKey: sub.billing_key,
      customerKey: sub.user_id,
      amount,
      orderId,
      orderName: getOrderName(cycle),
    });

    const email = (sub as any).profiles?.email;

    if (result.success) {
      const newStart = new Date(sub.current_period_end);
      const newEnd = calcNextPeriodEnd(newStart, cycle);

      const { error: updateErr } = await admin.from("subscriptions").update({
        status: "active",
        current_period_start: newStart.toISOString(),
        current_period_end: newEnd.toISOString(),
        retry_count: 0,
        updated_at: now.toISOString(),
      }).eq("id", sub.id);

      if (updateErr) {
        console.error("CRITICAL: retry charge succeeded but DB update failed", { subId: sub.id, error: updateErr });
        continue;
      }

      await admin.from("profiles").update({
        plan_expires_at: newEnd.toISOString(),
      }).eq("id", sub.user_id);

      await admin.from("payments").insert({
        user_id: sub.user_id, plan: sub.plan, amount, status: "done",
        order_id: orderId, payment_key: result.data?.paymentKey,
        subscription_id: sub.id, billing_cycle: cycle, is_renewal: true,
      });

      await admin.from("subscription_events").insert({
        subscription_id: sub.id, user_id: sub.user_id,
        event_type: "retry_success", payment_key: result.data?.paymentKey, amount,
      });

      retried++;
    } else {
      const newRetry = sub.retry_count + 1;

      if (newRetry >= 3) {
        // 3회 실패 → 무료 전환
        await admin.from("subscriptions").update({
          status: "expired", retry_count: newRetry, updated_at: now.toISOString(),
        }).eq("id", sub.id);

        await admin.from("profiles").update({
          plan: "free", plan_expires_at: null,
        }).eq("id", sub.user_id);

        await admin.from("subscription_events").insert({
          subscription_id: sub.id, user_id: sub.user_id,
          event_type: "expired", metadata: { reason: "3x_payment_failed" },
        });

        if (email) sendExpired(email).catch(console.error);
        downgraded++;
      } else {
        await admin.from("subscriptions").update({
          retry_count: newRetry, updated_at: now.toISOString(),
        }).eq("id", sub.id);

        await admin.from("subscription_events").insert({
          subscription_id: sub.id, user_id: sub.user_id,
          event_type: "payment_failed", metadata: { retry: newRetry, error: result.error },
        });

        if (email) sendPaymentFailed(email, newRetry).catch(console.error);
      }
    }
  }

  return apiSuccess({ retried, downgraded, timestamp: now.toISOString() });
}
