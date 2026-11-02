import { prisma } from "@/lib/prisma";
import { generateTrackingCode, HOLD_MINUTES, loadTarget, reacquireHold, recordStatus, type StatusSource } from "@/lib/booking";
import { sendBookingTrackingSms } from "@/lib/sms";
import { requestPayment, verifyPayment, ZarinpalError } from "@/lib/zarinpal";

export const CALLBACK_PATH = "/api/payment/zarinpal/callback";

/** آدرس سایت برای callback. بهتر است SITE_URL تنظیم شود (مثلاً https://padrapark.ir). */
export function getSiteUrl(request: Request) {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");

  if (configured) return configured;

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;

  return `${proto}://${host}`;
}

type BookingForPayment = {
  id: number;
  amount: number;
  customerPhone: string;
  date: Date;
  startTime: string;
  gameId: number | null;
  eventId: number | null;
};

async function titleOf(booking: Pick<BookingForPayment, "gameId" | "eventId">) {
  const target = await loadTarget(
    booking.gameId ? "game" : "event",
    (booking.gameId ?? booking.eventId) as number
  );

  return target?.name ?? "رزرو";
}

/** ایجاد تراکنش در زرین‌پال و برگرداندن آدرس انتقال کاربر به درگاه. */
export async function startPayment(booking: BookingForPayment, siteUrl: string) {
  const title = await titleOf(booking);
  const date = booking.date.toISOString().slice(0, 10);

  const { authority, paymentUrl } = await requestPayment({
    amountToman: booking.amount,
    callbackUrl: `${siteUrl}${CALLBACK_PATH}`,
    description: `رزرو ${title} - ${date} ساعت ${booking.startTime}`,
    mobile: booking.customerPhone,
    orderId: String(booking.id),
  });

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentAuthority: authority,
        // مهلت پرداخت از لحظه‌ی رفتن به درگاه شروع می‌شود
        expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
      },
    }),
    // هر تلاش پرداخت یک ردیف مستقل دارد (تلاش‌های قبلی این رزرو که هنوز باز مانده‌اند رها شده‌اند)
    prisma.payment.updateMany({
      where: { bookingId: booking.id, status: "PENDING" },
      data: { status: "ABANDONED" },
    }),
    prisma.payment.create({
      data: { bookingId: booking.id, authority, amount: booking.amount, status: "PENDING" },
    }),
  ]);

  return paymentUrl;
}

/** رزرو بدون مبلغ (رایگان) بدون درگاه تأیید می‌شود. */
export async function confirmFreeBooking(bookingId: number) {
  return markPaid(bookingId, null);
}

export type PaymentOutcome =
  | { outcome: "success"; trackingCode: string }
  | { outcome: "failed"; message: string }
  | { outcome: "expired"; message: string }
  | { outcome: "error"; message: string }
  | { outcome: "notfound" };

async function cancelPending(
  bookingId: number,
  options: { source?: StatusSource; note?: string; paymentStatus?: "FAILED" | "ABANDONED"; failCode?: number | null } = {}
) {
  const result = await prisma.booking.updateMany({
    where: { id: bookingId, status: "PENDING" },
    data: { status: "CANCELLED", expiresAt: null },
  });

  if (result.count === 1) {
    await recordStatus(prisma, bookingId, "PENDING", "CANCELLED", options.source ?? "PAYMENT", { note: options.note ?? null });
  }

  await prisma.payment.updateMany({
    where: { bookingId, status: "PENDING" },
    data: {
      status: options.paymentStatus ?? "FAILED",
      failCode: options.failCode ?? null,
      failNote: options.note ?? null,
    },
  });
}

type BookingForSms = {
  id: number;
  customerPhone: string;
  trackingCode: string | null;
  date: Date;
  startTime: string;
  quantity: number;
  gameId: number | null;
  eventId: number | null;
};

/** پیامک کد رهگیری؛ فقط اگر واقعاً ارسال شد smsSentAt ثبت می‌شود تا job تطبیق در غیر این صورت دوباره تلاش کند. */
export async function sendTrackingSmsOnce(booking: BookingForSms) {
  if (!booking.trackingCode) return false;

  const sent = await sendBookingTrackingSms({
    phone: booking.customerPhone,
    trackingCode: booking.trackingCode,
    title: await titleOf(booking),
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    quantity: booking.quantity,
  });

  if (sent) {
    await prisma.booking.updateMany({ where: { id: booking.id, smsSentAt: null }, data: { smsSentAt: new Date() } });
  }

  return sent;
}

/**
 * ثبت پرداخت موفق: وضعیت CONFIRMED، ref_id، زمان پرداخت و کد رهگیری.
 * فقط اگر هنوز PENDING باشد انجام می‌شود (callback تکراری یا هم‌زمان، فقط یک بار اثر دارد)
 * و فقط در همان یک بار پیامک ارسال می‌شود.
 */
async function markPaid(
  bookingId: number,
  refId: string | null,
  options: { source?: StatusSource; cardPan?: string | null } = {}
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          paymentRef: refId,
          paidAt: new Date(),
          expiresAt: null,
          trackingCode: generateTrackingCode(),
        },
      });

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

      if (!booking?.trackingCode) {
        throw new Error("Booking confirmed without tracking code");
      }

      if (result.count === 1) {
        await recordStatus(prisma, bookingId, "PENDING", "CONFIRMED", options.source ?? "PAYMENT", {
          note: refId ? `ref_id: ${refId}` : "رزرو رایگان",
        });

        if (refId) {
          await prisma.payment.updateMany({
            where: { bookingId, status: "PENDING" },
            data: { status: "PAID", refId, cardPan: options.cardPan ?? null, verifiedAt: new Date() },
          });
        }

        await sendTrackingSmsOnce(booking);
      }

      return booking.trackingCode;
    } catch (error) {
      // برخورد نادر کد رهگیری تکراری (unique) → دوباره با کد جدید
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not generate a unique tracking code");
}

/**
 * پردازش بازگشت کاربر از درگاه (callback).
 * ترتیب مهم است: تا ظرفیت قطعی نباشد verify نمی‌زنیم؛ پرداختِ تأییدنشده را زرین‌پال خودش به کاربر برمی‌گرداند.
 */
export async function finalizePayment(
  authority: string,
  status: string,
  source: StatusSource = "PAYMENT"
): Promise<PaymentOutcome> {
  if (!authority) return { outcome: "notfound" };

  const booking = await prisma.booking.findUnique({
    where: { paymentAuthority: authority },
  });

  if (!booking) return { outcome: "notfound" };

  // رفرش یا callback تکراری
  if (booking.status === "CONFIRMED" && booking.trackingCode) {
    return { outcome: "success", trackingCode: booking.trackingCode };
  }

  if (booking.status === "CANCELLED") {
    return {
      outcome: "failed",
      message: "این رزرو لغو شده است. اگر مبلغی کسر شده، تا ۷۲ ساعت به حساب شما برمی‌گردد.",
    };
  }

  if (status !== "OK") {
    await cancelPending(booking.id, { source, note: "پرداخت توسط کاربر لغو یا ناموفق شد", paymentStatus: "FAILED" });

    return { outcome: "failed", message: "پرداخت انجام نشد یا توسط شما لغو شد. رزرو لغو گردید." };
  }

  // مهلت تمام شده؟ فقط اگر ظرفیت هنوز خالی است ادامه می‌دهیم
  if (!booking.expiresAt || booking.expiresAt.getTime() <= Date.now()) {
    const held = await reacquireHold(booking);

    if (!held) {
      // verify زده نمی‌شود؛ زرین‌پال مبلغ تأییدنشده را خودش برمی‌گرداند
      await cancelPending(booking.id, { source, note: "مهلت پرداخت تمام شد و ظرفیت پر شد", paymentStatus: "ABANDONED" });

      return {
        outcome: "expired",
        message:
          "مهلت پرداخت تمام شد و این نوبت در این فاصله رزرو شد. مبلغ پرداختی (در صورت کسر) تا ۷۲ ساعت به حساب شما برمی‌گردد.",
      };
    }
  }

  try {
    const result = await verifyPayment({
      authority,
      amountToman: booking.amount,
    });

    if (result.status === "failed") {
      await cancelPending(booking.id, { source, note: result.message || "تأیید درگاه ناموفق", paymentStatus: "FAILED", failCode: result.code });

      console.error("ZARINPAL VERIFY FAILED:", result);

      return { outcome: "failed", message: "پرداخت توسط درگاه تأیید نشد. رزرو لغو گردید." };
    }

    const trackingCode = await markPaid(booking.id, result.refId, { source, cardPan: result.cardPan });

    return { outcome: "success", trackingCode };
  } catch (error) {
    // خطای ارتباطی: رزرو PENDING می‌ماند تا با رفرش صفحه یا تلاش مجدد، دوباره verify شود
    console.error("PAYMENT FINALIZE ERROR:", error);

    return {
      outcome: "error",
      message:
        error instanceof ZarinpalError
          ? "در تأیید پرداخت خطایی رخ داد. چند دقیقه بعد همین صفحه را دوباره باز کنید یا در پروفایل وضعیت را ببینید."
          : "خطای داخلی در ثبت پرداخت. اگر مبلغ کسر شده با پشتیبانی تماس بگیرید.",
    };
  }
}
