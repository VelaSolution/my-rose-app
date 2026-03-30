// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 로그인 필수 경로
const PROTECTED_PATHS = [
  "/simulator",
  "/result",
  "/profile",
  "/dashboard",
  "/monthly-input",
  "/tools/menu-cost/saved",  // 저장된 원가 현황 (로그인 필요)
  "/tools/sns-content",
  "/tools/review-reply",
  "/tools/area-analysis",
];
// 도구 목록·원가계산기·인건비·세금·체크리스트·PL리포트는 로그인 없이 접근 가능

const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthPage) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 관리자 전용: ADMIN_EMAIL 환경변수에 허용 이메일 설정
  if (isProtected && user && process.env.ADMIN_EMAIL) {
    const allowed = process.env.ADMIN_EMAIL.split(",").map(e => e.trim().toLowerCase());
    if (!allowed.includes((user.email ?? "").toLowerCase())) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth|unauthorized).*)"],
};
