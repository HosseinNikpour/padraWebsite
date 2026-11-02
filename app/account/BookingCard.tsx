"use client";

import { BOOKING_STATUS_LABEL, fa, formatPersianDate } from "@/lib/format";

export type CustomerBooking = {
  id: number;
  kind: "game" | "event";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  quantity: number;
  amount: number;
  status: "CONFIRMED" | "PENDING" | "EXPIRED" | "CANCELLED";
  trackingCode: string | null;
  payUrl: string | null;
  canCancel: boolean;
};

export default function BookingCard({
  booking,
  onCancel,
  busy,
}: {
  booking: CustomerBooking;
  onCancel?: (booking: CustomerBooking) => void;
  busy?: boolean;
}) {
  return (
    <article className={`acc-booking acc-booking--${booking.status.toLowerCase()}`}>
      <header>
        <div>
          <strong>{booking.title}</strong>
          <small>{booking.kind === "game" ? "بازی" : "ایونت"}</small>
        </div>

        <span className={`acc-badge acc-badge--${booking.status.toLowerCase()}`}>
          {BOOKING_STATUS_LABEL[booking.status]}
        </span>
      </header>

      <dl>
        <div>
          <dt>تاریخ</dt>
          <dd>{formatPersianDate(booking.date)}</dd>
        </div>
        <div>
          <dt>ساعت</dt>
          <dd dir="ltr">
            {booking.startTime} – {booking.endTime}
          </dd>
        </div>
        <div>
          <dt>تعداد نفرات</dt>
          <dd>{fa(booking.quantity)} نفر</dd>
        </div>
        <div>
          <dt>مبلغ</dt>
          <dd>{fa(booking.amount)} تومان</dd>
        </div>
      </dl>

      {booking.trackingCode && (
        <div className="acc-tracking">
          <span>کد رهگیری</span>
          <strong dir="ltr">{booking.trackingCode}</strong>
        </div>
      )}

      {(booking.payUrl || (booking.canCancel && onCancel)) && (
        <div className="acc-booking-actions">
          {booking.payUrl && (
            <a className="acc-button acc-button--small" href={booking.payUrl}>
              ادامه‌ی پرداخت
            </a>
          )}

          {booking.canCancel && onCancel && (
            <button
              type="button"
              className="acc-button acc-button--small acc-button--ghost"
              disabled={busy}
              onClick={() => onCancel(booking)}
            >
              لغو رزرو
            </button>
          )}
        </div>
      )}
    </article>
  );
}
