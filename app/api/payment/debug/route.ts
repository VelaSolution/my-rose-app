import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 인증된 사용자 확인
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ step: "auth", error: authError?.message ?? "no user" });
    }

    // 2. payments 테이블 조회 (admin)
    const { data: payments, error: payError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // 3. profiles 테이블 조회 (admin)
    const { data: profile, error: profError } = await supabaseAdmin
      .from("profiles")
      .select("id, plan")
      .eq("id", user.id)
      .single();

    // 4. 테스트 insert 후 삭제
    const testId = `debug-${Date.now()}`;
    const { error: testInsertError } = await supabaseAdmin
      .from("payments")
      .insert({ user_id: user.id, plan: "debug-test", amount: 0, status: "test" });

    // 삭제
    if (!testInsertError) {
      await supabaseAdmin.from("payments").delete().eq("status", "test").eq("user_id", user.id);
    }

    return NextResponse.json({
      userId: user.id,
      payments: { data: payments, error: payError?.message ?? null },
      profile: { data: profile, error: profError?.message ?? null },
      testInsert: { success: !testInsertError, error: testInsertError?.message ?? null },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
