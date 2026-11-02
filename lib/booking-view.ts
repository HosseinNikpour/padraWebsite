import { paymentUrlFor } from "@/lib/zarinpal";

type BookingRow = {
  id: number;
  gameId: number | null;
  date: Date;
  startTime: string;
  endTime: string;
  quantity: number;
  amount: number;
  status: string;
  trackingCode: string | null;
  paymentAuthority: string | null;
  paymentRef: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  game?: { name: string } | null;
  event?: { title: string } | null;
};

/** نمای عمومی رزرو برای مشتری (بدون اطلاعات داخلی) */
export function toCustomerBooking(booking: BookingRow) {
  const now = Date.now();
  const pending = booking.status === "PENDING";
  const expired = pending && (!booking.expiresAt || booking.expiresAt.getTime() <= now);

  return {
    id: booking.id,
    kind: booking.gameId ? ("game" as const) : ("event" as const),
    title: booking.game?.name ?? booking.event?.title ?? "—",
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    quantity: booking.quantity,
    amount: booking.amount,
    // PENDING منقضی‌شده برای کاربر «منقضی» است
    status: expired ? "EXPIRED" : booking.status,
    trackingCode: booking.trackingCode,
    paidAt: booking.paidAt,
    createdAt: booking.createdAt,
    // رزرو پرداخت‌نشده‌ی در مهلت را مشتری می‌تواند خودش لغو کند
    canCancel: pending && !expired,
    // ادامه‌ی پرداخت برای رزروی که هنوز مهلت دارد
    payUrl:
      pending && !expired && booking.paymentAuthority
        ? paymentUrlFor(booking.paymentAuthority)
        : null,
  };
}
