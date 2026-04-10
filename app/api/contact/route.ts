// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "필드를 모두 입력해 주세요." }, { status: 400 });
    }

    const safeName = String(name).slice(0, 100);
    const safeEmail = String(email).slice(0, 200);
    const safeMessage = String(message).slice(0, 5000);

    // 1) Save to Supabase (primary — must succeed)
    const { error: dbError } = await supabaseAdmin
      .from("contact_inquiries")
      .insert({ name: safeName, email: safeEmail, message: safeMessage });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json({ error: "문의 저장 실패", detail: dbError.message }, { status: 500 });
    }

    // 2) Try sending email notification (best-effort — don't fail if this breaks)
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "VELA 문의 <onboarding@resend.dev>",
            to: ["mnhyuk0213@gmail.com"],
            reply_to: safeEmail,
            subject: `[VELA 문의] ${esc(safeName)}님의 문의`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #3182F6; margin-bottom: 24px;">새 문의가 도착했습니다</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 80px;">이름</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 600;">${esc(safeName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">이메일</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${esc(safeEmail)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px 12px 0; color: #666; vertical-align: top;">문의</td>
                    <td style="padding: 12px 0; white-space: pre-wrap;">${esc(safeMessage)}</td>
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
          console.error("Resend error (non-fatal):", err);
        }
      } catch (emailErr) {
        console.error("Email send failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
