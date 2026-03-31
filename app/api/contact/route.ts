// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "필드를 모두 입력해 주세요." }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VELA 문의 <onboarding@resend.dev>",
        to: ["mnhyuk@velaanalytics.com"],               // ← 본인 이메일
        reply_to: email,
        subject: `[VELA 문의] ${name}님의 문의`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3182F6; margin-bottom: 24px;">새 문의가 도착했습니다</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 80px;">이름</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">이메일</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px 12px 0; color: #666; vertical-align: top;">문의</td>
                <td style="padding: 12px 0; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            <p style="margin-top: 24px; color: #999; font-size: 13px;">
              이 메일은 VELA 문의 폼을 통해 자동 발송되었습니다.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "이메일 발송 실패" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
