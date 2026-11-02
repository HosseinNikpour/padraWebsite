import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { isValidDate } from "@/lib/availability";
import {
  BookingError,
  createBooking,
  loadTarget,
  parseTargetType,
  recordStatus,
} from "@/lib/booking";
import { getBookingIdentity } from "@/lib/booking-identity";
import { checkOtpToken, consumeOtp } from "@/lib/otp";
import { confirmFreeBooking, getSiteUrl, startPayment } from "@/lib/payment";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { ZarinpalError } from "@/lib/zarinpal";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * ثبت رزرو و انتقال به درگاه پرداخت زرین‌پال.
 * مشتری واردشده: نام و موبایل از حساب خودش می‌آید. مهمان: customerName و customerPhone الزامی است.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = await rateLimit(`booking:ip:${ip}`, 8, 10 * 60 * 1000);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره امتحان کنید" },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "اطلاعات رزرو نامعتبر است" }, { status: 400 });
    }

    const type = parseTargetType(body.type);
    const id = Number(body.id);
    const date = body.date;
    const startTime = String(body.startTime ?? "");
    const quantity = Number(body.quantity);

    if (!type || !Number.isInteger(id) || !isValidDate(date)) {
      return NextResponse.json(
        { error: "اطلاعات رزرو نامعتبر است" },
        { status: 400 }
      );
    }

    // مشتری واردشده یا پرسنلِ واردشده: نام از حساب؛ موبایل از حساب (اگر پرسنل موبایل ندارد، از فرم)
    const customer = await getBookingIdentity();

    const customerName = customer
      ? customer.name
      : String(body.customerName ?? "").trim();
    // موبایل حساب در اولویت است؛ اگر حساب (مثلاً پرسنل) موبایل ندارد یا مهمان است، از فرم گرفته می‌شود
    const customerPhone = parsePhone(customer?.phone) ?? parsePhone(body.customerPhone);

    if (customerName.length < 2 || customerName.length > 60) {
      return NextResponse.json(
        { error: "نام و نام خانوادگی را وارد کنید" },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }

    const phoneLimit = await rateLimit(`booking:phone:${customerPhone}`, 5, 60 * 60 * 1000);

    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: "برای این شماره تعداد رزروها زیاد است. بعداً تلاش کنید" },
        { status: 429 }
      );
    }

    // مهمان باید شماره‌ی موبایلش را با کد پیامکی تأیید کرده باشد؛ مشتری واردشده شماره‌ی تأییدشده‌ی حسابش را دارد
    let otpId: number | null = null;

    if (!customer) {
      otpId = await checkOtpToken(body.otpToken, customerPhone);

      if (!otpId) {
        return NextResponse.json(
          { error: "ابتدا شماره موبایل خود را با کد پیامکی تأیید کنید", code: "OTP_REQUIRED" },
          { status: 403 }
        );
      }
    }

    const target = await loadTarget(type, id);

    if (!target) {
      return NextResponse.json(
        { error: "مورد درخواستی پیدا نشد" },
        { status: 404 }
      );
    }

    const booking = await createBooking({
      target,
      date,
      startTime,
      quantity,
      customerName,
      customerPhone,
      userId: customer?.id ?? null,
    });

    if (otpId) await consumeOtp(otpId);

    // رزرو رایگان: بدون درگاه، مستقیم تأیید و کد رهگیری ساخته می‌شود
    if (booking.amount <= 0) {
      const trackingCode = await confirmFreeBooking(booking.id);

      return NextResponse.json(
        { id: booking.id, free: true, trackingCode },
        { status: 201 }
      );
    }

    try {
      const paymentUrl = await startPayment(booking, getSiteUrl(request));

      return NextResponse.json(
        { id: booking.id, amount: booking.amount, paymentUrl },
        { status: 201 }
      );
    } catch (error) {
      // اگر درگاه در دسترس نبود، ظرفیت نگه‌داشته‌شده بلافاصله آزاد شود
      const cancelled = await prisma.booking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "CANCELLED", expiresAt: null },
      });

      if (cancelled.count === 1) {
        await recordStatus(prisma, booking.id, "PENDING", "CANCELLED", "SYSTEM", { note: "اتصال به درگاه ناموفق بود" });
      }

      console.error("START PAYMENT ERROR:", error);

      return NextResponse.json(
        {
          error:
            error instanceof ZarinpalError
              ? error.message
              : "خطا در اتصال به درگاه پرداخت",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("CREATE BOOKING ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ثبت رزرو" },
      { status: 500 }
    );
  }
}

/**
 * فهرست رزروها برای ادمین
 * GET /api/bookings?date=YYYY-MM-DD&status=CONFIRMED
 */
export async function GET(request: Request) {
  try {
    const auth = await authorize("bookings.view");
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    const bookings = await prisma.booking.findMany({
      where: {
        ...(isValidDate(date)
          ? { date: new Date(`${date}T00:00:00Z`) }
          : {}),
        ...(status && ["PENDING", "CONFIRMED", "CANCELLED"].includes(status)
          ? { status }
          : {}),
      },
      include: {
        game: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }, { id: "desc" }],
      take: 500,
    });

    return NextResponse.json(
      bookings.map((booking) => ({
        id: booking.id,
        kind: booking.gameId ? "game" : "event",
        title: booking.game?.name ?? booking.event?.title ?? "—",
        date: booking.date.toISOString().slice(0, 10),
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        quantity: booking.quantity,
        amount: booking.amount,
        status: booking.status,
        expiresAt: booking.expiresAt,
        trackingCode: booking.trackingCode,
        paymentRef: booking.paymentRef,
        paidAt: booking.paidAt,
        registered: booking.userId !== null,
        source: booking.source,
        note: booking.note,
        createdByName: booking.createdByName,
        createdAt: booking.createdAt,
      }))
    );
  } catch (error) {
    console.error("LIST BOOKINGS ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت رزروها" },
      { status: 500 }
    );
  }
}
