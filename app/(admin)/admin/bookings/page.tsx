"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CrudCard,
  CrudField,
  CrudPage,
} from "@/components/admin/crud/CrudPage";
import JalaliDateSelect from "@/components/staff/JalaliDateSelect";
import "@/components/staff/staff.css";
import { nowInTehran } from "@/lib/availability";
import { matchesQuery } from "@/lib/search";

import StaffBookingForm from "./StaffBookingForm";

type Booking = {
  id: number;
  kind: "game" | "event";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  expiresAt: string | null;
  trackingCode: string | null;
  paymentRef: string | null;
  registered: boolean;
  source: "ONLINE" | "STAFF";
  note: string | null;
  createdByName: string | null;
};

const STATUS_LABEL: Record<Booking["status"], string> = {
  PENDING: "در انتظار پرداخت",
  CONFIRMED: "پرداخت‌شده",
  CANCELLED: "لغو شده",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function searchText(booking: Booking) {
  return [
    booking.title,
    booking.kind === "game" ? "بازی" : "ایونت",
    booking.date,
    formatDate(booking.date),
    booking.startTime,
    booking.endTime,
    booking.customerName,
    booking.customerPhone,
    booking.trackingCode ?? "",
    String(booking.quantity),
    String(booking.amount),
    STATUS_LABEL[booking.status],
    booking.source === "STAFF" ? "حضوری ثبت حضوری" : booking.registered ? "عضو" : "مهمان",
    booking.note ?? "",
    booking.createdByName ?? "",
  ].join(" ");
}

export default function AdminBookingsPage() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const [date, setDate] = useState(() => nowInTehran().date);
  // پیش‌فرض: رزروهای پرداخت‌شده‌ی امروز
  const [status, setStatus] = useState("CONFIRMED");
  const [query, setQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (status) params.set("status", status);

      const response = await fetch(`/api/bookings?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت رزروها");
      }

      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت رزروها");
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: number, next: Booking["status"]) {
    if (
      next === "CANCELLED" &&
      !await confirmDialog("این رزرو لغو شود؟ ظرفیت نوبت دوباره آزاد می‌شود.")
    ) {
      return;
    }

    try {
      setBusyId(id);
      setError("");

      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در تغییر وضعیت");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    } finally {
      setBusyId(null);
    }
  }

  // جست‌وجوی سمت کلاینت روی همه‌ی ستون‌های جدول
  const visible = useMemo(
    () => bookings.filter((booking) => matchesQuery(searchText(booking), query)),
    [bookings, query]
  );

  const activePeople = visible
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((sum, booking) => sum + booking.quantity, 0);

  return (
    <CrudPage
      eyebrow="PADRA BOOKINGS"
      title="رزروها"
      description="رزروهای ثبت‌شده‌ی مشتریان. لغو یک رزرو، ظرفیت آن نوبت را بلافاصله آزاد می‌کند."
      count={visible.length}
      countLabel="رزرو"
    >
      <StaffBookingForm onCreated={load} />

      <CrudCard
        title="فهرست رزروها"
        description={
          date
            ? `${formatDate(date)} — مجموع نفرات فعال: ${activePeople.toLocaleString("fa-IR")}`
            : `همه‌ی تاریخ‌ها — مجموع نفرات فعال: ${activePeople.toLocaleString("fa-IR")}`
        }
      >
        <div className="crud-form-grid">
          <CrudField label="تاریخ (شمسی)">
            <JalaliDateSelect
              value={date || nowInTehran().date}
              onChange={setDate}
              yearsBefore={2}
              yearsAfter={1}
            />
            {!date && <small>فیلتر تاریخ خاموش است (همه‌ی تاریخ‌ها)؛ با انتخاب تاریخ فعال می‌شود.</small>}
          </CrudField>

          <CrudField label="وضعیت">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">همه</option>
              <option value="CONFIRMED">پرداخت‌شده</option>
              <option value="PENDING">در انتظار پرداخت</option>
              <option value="CANCELLED">لغو شده</option>
            </select>
          </CrudField>
        </div>

        <div className="crud-form-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="crud-button crud-button--secondary"
            onClick={() => setDate(nowInTehran().date)}
          >
            امروز
          </button>
          <button
            type="button"
            className="crud-button crud-button--secondary"
            onClick={() => setDate("")}
          >
            همه‌ی تاریخ‌ها
          </button>
        </div>

        {error && (
          <div className="crud-alert crud-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="crud-form-grid" style={{ marginTop: 12 }}>
          <CrudField label="جست‌وجو در همه‌ی ستون‌ها">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام، موبایل، کد رهگیری، بازی، توضیحات..."
              aria-label="جست‌وجو در جدول رزروها"
            />
          </CrudField>
        </div>

        {loading ? (
          <div className="crud-empty">در حال دریافت...</div>
        ) : visible.length === 0 ? (
          <div className="crud-empty">{bookings.length ? "موردی با این جست‌وجو پیدا نشد." : "رزروی پیدا نشد."}</div>
        ) : (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>بازی / ایونت</th>
                  <th>تاریخ</th>
                  <th>ساعت</th>
                  <th>مشتری</th>
                  <th>موبایل</th>
                  <th>کد رهگیری</th>
                  <th>نفرات</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.title}</strong>{" "}
                      <span className="crud-tag">
                        {booking.kind === "game" ? "بازی" : "ایونت"}
                      </span>
                    </td>
                    <td>{formatDate(booking.date)}</td>
                    <td dir="ltr">
                      {booking.startTime} – {booking.endTime}
                    </td>
                    <td>
                      {booking.customerName}{" "}
                      <span className="crud-tag">
                        {booking.source === "STAFF" ? "حضوری" : booking.registered ? "عضو" : "مهمان"}
                      </span>
                      {booking.source === "STAFF" && (
                        <small style={{ display: "block", color: "#7b8da3" }}>
                          {booking.note}
                          {booking.createdByName ? ` — ثبت: ${booking.createdByName}` : ""}
                        </small>
                      )}
                    </td>
                    <td dir="ltr">{booking.customerPhone || "—"}</td>
                    <td dir="ltr">
                      {booking.trackingCode ?? "—"}
                      {booking.paymentRef && (
                        <small style={{ display: "block", color: "#7b8da3" }}>
                          ref: {booking.paymentRef}
                        </small>
                      )}
                    </td>
                    <td>{booking.quantity.toLocaleString("fa-IR")}</td>
                    <td>{booking.amount.toLocaleString("fa-IR")} تومان</td>
                    <td>
                      <span
                        className={`crud-status ${
                          booking.status === "CANCELLED"
                            ? "crud-status--inactive"
                            : ""
                        }`}
                      >
                        {booking.status === "PENDING" &&
                        booking.expiresAt &&
                        new Date(booking.expiresAt).getTime() < Date.now()
                          ? "منقضی شده"
                          : booking.source === "STAFF" && booking.status === "CONFIRMED"
                            ? "ثبت حضوری"
                            : STATUS_LABEL[booking.status]}
                      </span>
                    </td>
                    <td>
                      <div className="crud-row-actions">
                        {booking.status !== "CONFIRMED" && (
                          <button
                            type="button"
                            className="crud-button crud-button--secondary"
                            disabled={busyId === booking.id}
                            onClick={() => changeStatus(booking.id, "CONFIRMED")}
                          >
                            تأیید
                          </button>
                        )}
                        {booking.status !== "CANCELLED" && (
                          <button
                            type="button"
                            className="crud-button crud-button--danger"
                            disabled={busyId === booking.id}
                            onClick={() => changeStatus(booking.id, "CANCELLED")}
                          >
                            لغو
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CrudCard>
    </CrudPage>
  );
}
