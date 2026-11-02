import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * لایه‌ی مرکزی (Next 16 proxy):
 *  1) /admin/** : بدون نشست پرسنلِ معتبر (امضا و انقضا) قبل از رندر به صفحه‌ی ورود هدایت می‌شود.
 *     (بررسی دقیق نقش و دسترسی همچنان در layout/API و با DB انجام می‌شود؛ این فقط لایه‌ی اول است.)
 *  2) /api/** با متد تغییردهنده: اگر هدر Origin وجود دارد باید با میزبان خود سایت یکی باشد (دفاع CSRF
 *     در کنار SameSite=Lax). درخواست‌های بدون Origin (دستگاه حضور و غیاب، curl) عبور می‌کنند و
 *     با کلید/نشست خودشان احراز می‌شوند.
 */
const STAFF_COOKIE = "padra_admin_session";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function hasValidStaffSession(request: NextRequest) {
  const token = request.cookies.get(STAFF_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!secret) return true; // پیکربندی ناقص را layout/API گزارش می‌کنند؛ اینجا قفل نمی‌کنیم
  if (!token) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));

    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.get("origin");

      if (origin) {
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
        let originHost = "";

        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = "";
        }

        if (!host || originHost !== host) {
          return NextResponse.json({ error: "درخواست از مبدأ نامعتبر" }, { status: 403 });
        }
      }
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  if (!(await hasValidStaffSession(request))) {
    const url = request.nextUrl.clone();

    url.pathname = "/account";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
