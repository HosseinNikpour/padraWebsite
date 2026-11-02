import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { recordStatus } from "@/lib/booking";
import { finalizePayment, sendTrackingSmsOnce } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";

  if (!secret) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * job دوره‌ای تطبیق (هر چند دقیقه؛ vercel.json).  Authorization: Bearer $CRON_SECRET
 *  1) رزروهای PENDING منقضی که تراکنش دارند: همان منطق callback (verify فقط اگر ظرفیت هست) تا
 *     پرداختِ ازدست‌رفته‌ی callback (بسته شدن مرورگر، خطای شبکه بعد از verify) به رزرو تبدیل شود.
 *  2) رزروهای PENDING منقضی بدون تراکنش: لغو و ثبت در تاریخچه.
 *  3) پیامک کد رهگیری که ارسال نشده را دوباره می‌فرستد.
 *  4) پاک‌سازی کدهای تأیید قدیمی.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const now = new Date();
  const graceMs = 2 * 60 * 1000; // به callback واقعی کاربر فرصت می‌دهیم
  const summary = { payments: 0, paymentsConfirmed: 0, expiredWithoutPayment: 0, smsRetried: 0, smsSent: 0, otpDeleted: 0 };

  try {
    // 1) منقضی با تراکنش
    const stale = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        paymentAuthority: { not: null },
        expiresAt: { lt: new Date(now.getTime() - graceMs) },
        createdAt: { gt: new Date(now.getTime() - 3 * 24 * 3600 * 1000) },
      },
      select: { id: true, paymentAuthority: true },
      orderBy: { expiresAt: "asc" },
      take: 40,
    });

    for (const row of stale) {
      if (!row.paymentAuthority) continue;

      summary.payments += 1;

      const outcome = await finalizePayment(row.paymentAuthority, "OK", "CRON").catch((error) => {
        console.error("RECONCILE ERROR:", row.id, error);

        return null;
      });

      if (outcome?.outcome === "success") summary.paymentsConfirmed += 1;
    }

    // 2) منقضی بدون تراکنش (کاربر هرگز به درگاه نرفت)
    const abandoned = await prisma.booking.findMany({
      where: { status: "PENDING", paymentAuthority: null, expiresAt: { lt: now } },
      select: { id: true },
      take: 200,
    });

    for (const row of abandoned) {
      const result = await prisma.booking.updateMany({
        where: { id: row.id, status: "PENDING", paymentAuthority: null },
        data: { status: "CANCELLED", expiresAt: null },
      });

      if (result.count === 1) {
        summary.expiredWithoutPayment += 1;
        await recordStatus(prisma, row.id, "PENDING", "CANCELLED", "CRON", { note: "مهلت نگه‌داشتن ظرفیت تمام شد" });
      }
    }

    // 3) پیامک‌های ارسال‌نشده
    const unsent = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        smsSentAt: null,
        trackingCode: { not: null },
        paidAt: { gt: new Date(now.getTime() - 24 * 3600 * 1000), lt: new Date(now.getTime() - graceMs) },
      },
      take: 30,
    });

    for (const booking of unsent) {
      summary.smsRetried += 1;

      if (await sendTrackingSmsOnce(booking)) summary.smsSent += 1;
    }

    // 4) پاک‌سازی OTP
    const deleted = await prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } } });

    summary.otpDeleted = deleted.count;

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("RECONCILE CRON ERROR:", error);

    return NextResponse.json({ error: "خطا در اجرای job", ...summary }, { status: 500 });
  }
}
