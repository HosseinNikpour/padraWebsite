import { NextResponse } from "next/server";

import { OtpError, verifyOtp } from "@/lib/otp";
import { normalizeDigits } from "@/lib/availability";
import { parsePhone } from "@/lib/phone";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/** بررسی کد تأیید. POST { phone, code } → { otpToken } (۱۵ دقیقه معتبر، یک‌بار مصرف در ثبت رزرو) */
export async function POST(request: Request) {
  try {
    const ipLimit = await rateLimit(`otpv:ip:${getClientIp(request)}`, 30, 60 * 60 * 1000);

    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است. بعداً تلاش کنید" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const phone = parsePhone(body?.phone);
    const code = normalizeDigits(String(body?.code ?? "")).replace(/\D/g, "");

    if (!phone || code.length !== 6) {
      return NextResponse.json({ error: "شماره موبایل یا کد معتبر نیست" }, { status: 400 });
    }

    const otpToken = await verifyOtp(phone, code);

    return NextResponse.json({ otpToken });
  } catch (error) {
    if (error instanceof OtpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("OTP VERIFY ERROR:", error);

    return NextResponse.json({ error: "خطا در بررسی کد" }, { status: 500 });
  }
}
