import { NextResponse } from "next/server";

import { toCustomerBooking } from "@/lib/booking-view";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/** پیگیری رزرو مهمان با «شماره موبایل + کد رهگیری» */
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`lookup:ip:${getClientIp(request)}`, 15, 15 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) ?? {};
    const phone = parsePhone(body.phone);
    const code = String(body.trackingCode ?? "").trim().toUpperCase();

    if (!phone || !/^PDR-[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: "شماره موبایل یا کد رهگیری معتبر نیست" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { trackingCode: code, customerPhone: phone },
      include: {
        game: { select: { name: true } },
        event: { select: { title: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "رزروی با این مشخصات پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json(toCustomerBooking(booking));
  } catch (error) {
    console.error("BOOKING LOOKUP ERROR:", error);

    return NextResponse.json({ error: "خطا در پیگیری رزرو" }, { status: 500 });
  }
}
