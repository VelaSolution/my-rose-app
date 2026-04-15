/**
 * 토스페이먼츠 빌링 API 헬퍼
 * - 빌링키 발급
 * - 빌링키로 자동 결제
 * - 웹훅 서명 검증
 */

const TOSS_API = "https://api.tosspayments.com/v1";

function getAuthHeader() {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error("TOSS_SECRET_KEY not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/** authKey로 빌링키 발급 */
export async function issueBillingKey(authKey: string, customerKey: string) {
  const res = await fetch(`${TOSS_API}/billing/authorizations/issue`, {
    method: "POST",
    headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ authKey, customerKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "빌링키 발급 실패");
  return data as {
    billingKey: string;
    customerKey: string;
    card: { number: string; cardCompany: string; cardCompanyCode: string };
  };
}

/** 빌링키로 자동 결제 */
export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}) {
  const res = await fetch(`${TOSS_API}/billing/${params.billingKey}`, {
    method: "POST",
    headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.message || "결제 실패", code: data.code, data };
  }
  return { success: true, data: data as { paymentKey: string; orderId: string; totalAmount: number } };
}

/** 구독 금액 계산 */
export function getSubscriptionAmount(billingCycle: "monthly" | "annual"): number {
  return billingCycle === "annual" ? 24900 * 12 : 29900;
}

/** 구독 주문명 */
export function getOrderName(billingCycle: "monthly" | "annual"): string {
  return billingCycle === "annual" ? "VELA 프로 플랜 (연간)" : "VELA 프로 플랜 (월간)";
}

/** orderId 생성 */
export function generateOrderId(billingCycle: "monthly" | "annual", isRenewal = false): string {
  const prefix = isRenewal ? "VELA-renew" : "VELA-standard";
  return `${prefix}-${billingCycle}-${Date.now()}`;
}

/** 다음 결제일 계산 (월말 롤오버 안전) */
export function calcNextPeriodEnd(from: Date, billingCycle: "monthly" | "annual"): Date {
  const next = new Date(from);
  const origDay = next.getDate();
  if (billingCycle === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  // 월말 롤오버 방지: 1/31 + 1개월 → 2/28 (3/3이 아님)
  if (next.getDate() !== origDay) {
    next.setDate(0); // 이전 달의 마지막 날로
  }
  return next;
}

/** 웹훅 서명 검증 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret) return false;
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return signature === expected;
}
