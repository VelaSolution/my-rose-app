import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "pub-8fd7d785db83458b8cf8e3a4747b3370.r2.dev",
  "mkhnkgjpjsjadxuxtiya.supabase.co",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL 필요" }, { status: 400 });

  // SSRF 방지: 허용된 도메인만
  try {
    const parsed = new URL(url);
    if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
      return NextResponse.json({ error: "허용되지 않은 도메인" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "잘못된 URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "text/plain";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "파일 로드 실패" }, { status: 500 });
  }
}
