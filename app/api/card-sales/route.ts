import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/card-sales
 * 여신금융협회 카드매출 조회
 * body: { bizNumber: string }
 *
 * TODO: 여신금융협회 API 키 발급 후 실제 연동
 * 현재는 데모 데이터 반환
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { key: "card-sales", limit: 5 });
    if (!rl.ok) return rateLimitResponse();

    const { bizNumber } = await req.json();

    if (!bizNumber || String(bizNumber).replace(/-/g, "").length !== 10) {
      return apiError("사업자등록번호 10자리를 입력해주세요.", 400);
    }

    const apiKey = process.env.CREFIA_API_KEY; // 여신금융협회 API 키

    if (apiKey) {
      // === 실제 API 연동 ===
      // 여신금융협회 가맹점매출 조회 API
      // https://www.crefia.or.kr 에서 API 키 발급 필요
      //
      // const now = new Date();
      // const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10).replace(/-/g,"");
      // const endDate = now.toISOString().slice(0,10).replace(/-/g,"");
      //
      // const res = await fetch(`https://api.crefia.or.kr/v1/merchant/sales`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      //   body: JSON.stringify({ bizNo: bizNumber, startDate, endDate }),
      // });
      // const data = await res.json();
      // return NextResponse.json(transformCrefiaData(data));
    }

    // === 데모 데이터 (API 연동 전) ===
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return apiSuccess({
      period: thisMonth,
      totalSales: 18500000,
      totalCount: 1240,
      byCard: [
        { card: "삼성카드", sales: 5200000, count: 380, feeRate: 1.5, fee: 78000 },
        { card: "신한카드", sales: 4100000, count: 290, feeRate: 1.5, fee: 61500 },
        { card: "KB국민카드", sales: 3800000, count: 250, feeRate: 1.5, fee: 57000 },
        { card: "현대카드", sales: 2400000, count: 150, feeRate: 1.6, fee: 38400 },
        { card: "롯데카드", sales: 1500000, count: 90, feeRate: 1.5, fee: 22500 },
        { card: "BC카드", sales: 1000000, count: 50, feeRate: 1.5, fee: 15000 },
        { card: "기타", sales: 500000, count: 30, feeRate: 1.5, fee: 7500 },
      ],
      daily: Array.from({ length: now.getDate() }, (_, i) => ({
        date: `${thisMonth}-${String(i + 1).padStart(2, "0")}`,
        sales: Math.round(500000 + Math.random() * 400000),
        count: Math.round(30 + Math.random() * 30),
      })),
      _demo: true,
      _message: "데모 데이터입니다. 여신금융협회 API 키 등록 후 실제 데이터로 전환됩니다.",
    });
  } catch (e) {
    console.error("Card sales error:", e);
    return apiError("서버 오류", 500);
  }
}
