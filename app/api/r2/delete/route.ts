import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { r2, R2_BUCKET } from "@/lib/r2";

async function getUser(req: NextRequest) {
  const token = req.cookies.get("sb-mkhnkgjpjsjadxuxtiya-auth-token")?.value
    || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await sb.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: "키 없음" }, { status: 400 });

    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("R2 delete error:", e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
