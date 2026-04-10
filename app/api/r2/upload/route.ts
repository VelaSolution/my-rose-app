import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "";

    if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = folder ? `${folder}/${Date.now()}_${file.name}` : `${Date.now()}_${file.name}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // R2 public URL (커스텀 도메인 또는 r2.dev)
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      url: publicUrl,
      key,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (e) {
    console.error("R2 upload error:", e);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
