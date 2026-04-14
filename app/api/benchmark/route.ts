import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { apiError, apiSuccess } from "@/lib/api-error";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/benchmark?industry=cafe
 * 업종별 VELA 사용자 평균 지표 반환
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { key: "benchmark", limit: 10 });
  if (!rl.ok) return rateLimitResponse();

  const industry = req.nextUrl.searchParams.get("industry") ?? "restaurant";

  // 최근 3개월 스냅샷에서 업종별 평균 계산
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const sinceMonth = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

  const { data: snapshots, error } = await supabaseAdmin
    .from("monthly_snapshots")
    .select("total_sales, net_profit, cogs, industry")
    .eq("industry", industry)
    .gte("month", sinceMonth);

  if (error) {
    console.error("Benchmark query error:", error);
    return apiError("조회 실패", 500);
  }

  if (!snapshots || snapshots.length === 0) {
    return apiSuccess({
      industry,
      totalStores: 0,
      message: "아직 비교할 데이터가 충분하지 않습니다.",
    });
  }

  const n = snapshots.length;
  const avgSales = Math.round(snapshots.reduce((a, s) => a + (s.total_sales ?? 0), 0) / n);
  const avgProfit = Math.round(snapshots.reduce((a, s) => a + (s.net_profit ?? 0), 0) / n);
  const avgCogs = snapshots.reduce((a, s) => a + ((s.cogs ?? 0) / (s.total_sales || 1) * 100), 0) / n;
  const avgMargin = snapshots.reduce((a, s) => a + ((s.net_profit ?? 0) / (s.total_sales || 1) * 100), 0) / n;

  // 매출 순위 분포 (상위 %)
  const salesSorted = [...snapshots].sort((a, b) => (b.total_sales ?? 0) - (a.total_sales ?? 0));
  const profitSorted = [...snapshots].sort((a, b) => (b.net_profit ?? 0) - (a.net_profit ?? 0));

  return apiSuccess({
    industry,
    totalStores: new Set(snapshots.map(() => "store")).size, // 익명 처리
    sampleCount: n,
    averages: {
      monthlySales: avgSales,
      monthlyProfit: avgProfit,
      cogsRate: Math.round(avgCogs * 10) / 10,
      netMargin: Math.round(avgMargin * 10) / 10,
    },
    distribution: {
      top10Sales: salesSorted[Math.floor(n * 0.1)]?.total_sales ?? avgSales,
      top30Sales: salesSorted[Math.floor(n * 0.3)]?.total_sales ?? avgSales,
      medianSales: salesSorted[Math.floor(n * 0.5)]?.total_sales ?? avgSales,
      top10Profit: profitSorted[Math.floor(n * 0.1)]?.net_profit ?? avgProfit,
      top30Profit: profitSorted[Math.floor(n * 0.3)]?.net_profit ?? avgProfit,
    },
  });
}
