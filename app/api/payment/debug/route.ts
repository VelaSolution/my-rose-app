import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  try {
    // 1. supabaseAdmin 존재 확인
    result.adminExists = !!supabaseAdmin;

    // 2. 인증된 사용자 확인
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      result.auth = { userId, error: authError?.message ?? null };
    } catch (e) {
      result.auth = { error: `crash: ${String(e)}` };
    }

    if (!userId) {
      return NextResponse.json(result);
    }

    // 3. payments 테이블 조회
    try {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      result.payments = { count: data?.length ?? 0, data, error: error?.message ?? null };
    } catch (e) {
      result.payments = { error: `crash: ${String(e)}` };
    }

    // 4. profiles plan 컬럼 확인
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      result.profile = { data, error: error?.message ?? null };
    } catch (e) {
      result.profile = { error: `crash: ${String(e)}` };
    }

    // 5. 테스트 insert
    try {
      const { error } = await supabaseAdmin
        .from("payments")
        .insert({ user_id: userId, plan: "debug-test", amount: 0, status: "test" });
      result.testInsert = { success: !error, error: error?.message ?? null };
      // cleanup
      if (!error) {
        await supabaseAdmin.from("payments").delete().eq("status", "test").eq("user_id", userId);
      }
    } catch (e) {
      result.testInsert = { error: `crash: ${String(e)}` };
    }

  } catch (e) {
    result.fatalError = String(e);
  }

  return NextResponse.json(result);
}
