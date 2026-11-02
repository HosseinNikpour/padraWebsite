import { NextResponse } from "next/server";

import { OtpError, requestOtp } from "@/lib/otp";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/** درخواست کد تأیید پیامکی برای رزرو مهمان. POST { phone } */
export async function POST(request: Request) {
  try {
    const ipLimit = await rateLimit(`otp:ip:${getClientIp(request)}`, 10, 60 * 60 * 1000);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. بعداً تلاش کنید" },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const phone = parsePhone(body?.phone);

    if (!phone) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }

    const phoneLimit = await rateLimit(`otp:phone:${phone}`, 5, 60 * 60 * 1000);

    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: "برای این شماره تعداد درخواست‌ها زیاد است. بعداً تلاش کنید" }, { status: 429 });
    }

    await requestOtp(phone);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OtpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("OTP REQUEST ERROR:", error);

    return NextResponse.json({ error: "خطا در ارسال کد تأیید" }, { status: 500 });
  }
}
