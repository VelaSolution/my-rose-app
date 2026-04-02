import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  try {
    const supabase = await createSupabaseServerClient();

    // 1. 인증된 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    result.auth = { userId, error: authError?.message ?? null };

    if (!userId) {
      return NextResponse.json(result);
    }

    // 2. payments 테이블 조회
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      result.payments = { count: data?.length ?? 0, data, error: error?.message ?? null };
    } catch (e) {
      result.payments = { error: `crash: ${String(e)}` };
    }

    // 3. profiles plan 컬럼 확인
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      result.profile = { data, error: error?.message ?? null };
    } catch (e) {
      result.profile = { error: `crash: ${String(e)}` };
    }

    // 4. 테스트 insert
    try {
      const { error } = await supabase
        .from("payments")
        .insert({ user_id: userId, plan: "debug-test", amount: 0, status: "test", order_id: `debug-${Date.now()}`, payment_key: "debug" });
      result.testInsert = { success: !error, error: error?.message ?? null };
      if (!error) {
        await supabase.from("payments").delete().eq("status", "test").eq("user_id", userId);
      }
    } catch (e) {
      result.testInsert = { error: `crash: ${String(e)}` };
    }

  } catch (e) {
    result.fatalError = String(e);
  }

  return NextResponse.json(result);
}
