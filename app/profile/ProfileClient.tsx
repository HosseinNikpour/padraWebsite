"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { nowInTehran } from "@/lib/availability";
import { fa, formatPersianDate } from "@/lib/format";

import BookingCard, { type CustomerBooking } from "../account/BookingCard";

import "../account/account.css";
import "./profile.css";

type Profile = {
  customer: { id: number; name: string; phone: string; createdAt: string };
  stats: { total: number; confirmed: number; upcoming: number; totalPaid: number };
};

type Filter = "upcoming" | "past" | "pending" | "cancelled" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "upcoming", label: "پیش‌رو" },
  { key: "past", label: "گذشته" },
  { key: "pending", label: "در انتظار پرداخت" },
  { key: "cancelled", label: "لغو / منقضی" },
  { key: "all", label: "همه" },
];

function matches(filter: Filter, booking: CustomerBooking, today: string) {
  switch (filter) {
    case "upcoming":
      return booking.status === "CONFIRMED" && booking.date >= today;
    case "past":
      return booking.status === "CONFIRMED" && booking.date < today;
    case "pending":
      return booking.status === "PENDING";
    case "cancelled":
      return booking.status === "CANCELLED" || booking.status === "EXPIRED";
    default:
      return true;
  }
}

export default function ProfileClient() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"bookings" | "account">("bookings");
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [busyId, setBusyId] = useState<number | null>(null);

  // ویرایش اطلاعات
  const [name, setName] = useState("");
  const [nameMessage, setNameMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);

  // تغییر رمز
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passMessage, setPassMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const today = nowInTehran().date;

  const load = useCallback(async () => {
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        fetch("/api/customer/profile", { cache: "no-store" }),
        fetch("/api/customer/bookings", { cache: "no-store" }),
      ]);

      if (profileRes.status === 401) {
        window.location.replace(`/account?next=${encodeURIComponent("/profile")}`);
        return;
      }

      const profileData = await profileRes.json();
      const bookingsData = await bookingsRes.json();

      if (!profileRes.ok) throw new Error(profileData.error || "خطا در دریافت پروفایل");
      if (!bookingsRes.ok) throw new Error(bookingsData.error || "خطا در دریافت رزروها");

      setProfile(profileData);
      setName(profileData.customer.name);
      setBookings(bookingsData);

      // اگر رزرو پیش‌رو ندارد، همه را نشان بده
      const hasUpcoming = (bookingsData as CustomerBooking[]).some((b) =>
        matches("upcoming", b, today)
      );

      setFilter(hasUpcoming ? "upcoming" : "all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;

    for (const item of FILTERS) {
      result[item.key] = bookings.filter((b) => matches(item.key, b, today)).length;
    }

    return result;
  }, [bookings, today]);

  const visible = useMemo(
    () => bookings.filter((b) => matches(filter, b, today)),
    [bookings, filter, today]
  );

  async function cancelBooking(booking: CustomerBooking) {
    if (!await confirmDialog("این رزرو لغو شود؟")) return;

    try {
      setBusyId(booking.id);
      setError("");

      const response = await fetch(`/api/customer/bookings/${booking.id}/cancel`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "خطا در لغو رزرو");

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در لغو رزرو");
    } finally {
      setBusyId(null);
    }
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setNameMessage(null);

    try {
      setSavingName(true);

      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNameMessage({ ok: false, text: data.error || "خطا در ذخیره" });
        return;
      }

      setProfile((current) =>
        current ? { ...current, customer: { ...current.customer, name: data.name } } : current
      );
      setNameMessage({ ok: true, text: "اطلاعات ذخیره شد." });
    } catch {
      setNameMessage({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ ok: false, text: "تکرار رمز جدید با رمز جدید یکی نیست" });
      return;
    }

    try {
      setSavingPass(true);

      const response = await fetch("/api/customer/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPassMessage({ ok: false, text: data.error || "خطا در تغییر رمز" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassMessage({ ok: true, text: "رمز عبور تغییر کرد." });
    } catch {
      setPassMessage({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setSavingPass(false);
    }
  }

  async function logout() {
    await fetch("/api/customer/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="acc-page" dir="rtl">
        <div className="acc-container">
          <div className="acc-empty">در حال دریافت...</div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="acc-page" dir="rtl">
        <div className="acc-container">
          <div className="acc-alert acc-alert--error" role="alert">
            {error || "پروفایل پیدا نشد"}
          </div>
        </div>
      </main>
    );
  }

  const { customer, stats } = profile;

  return (
    <main className="acc-page" dir="rtl">
      <div className="acc-container">
        <Link href="/" className="acc-brand">
          پادرا<span>پارک</span>
        </Link>

        {/* سربرگ پروفایل */}
        <section className="pf-hero">
          <div className="pf-avatar" aria-hidden="true">
            {customer.name.trim().charAt(0) || "؟"}
          </div>

          <div className="pf-hero-info">
            <h1>{customer.name}</h1>
            <span dir="ltr">{customer.phone}</span>
            <small>عضو از {formatPersianDate(customer.createdAt.slice(0, 10))}</small>
          </div>

          <div className="pf-hero-actions">
            <Link className="acc-button acc-button--small" href="/booking">
              رزرو جدید
            </Link>
            <button
              type="button"
              className="acc-button acc-button--small acc-button--ghost"
              onClick={logout}
            >
              خروج
            </button>
          </div>
        </section>

        {/* آمار */}
        <section className="pf-stats">
          <div>
            <strong>{fa(stats.total)}</strong>
            <span>کل رزروها</span>
          </div>
          <div>
            <strong>{fa(stats.confirmed)}</strong>
            <span>پرداخت‌شده</span>
          </div>
          <div>
            <strong>{fa(stats.upcoming)}</strong>
            <span>رزرو پیش‌رو</span>
          </div>
          <div>
            <strong>{fa(stats.totalPaid)}</strong>
            <span>مجموع پرداختی (تومان)</span>
          </div>
        </section>

        {/* تب‌ها */}
        <div className="acc-tabs pf-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "bookings"}
            className={tab === "bookings" ? "active" : ""}
            onClick={() => setTab("bookings")}
          >
            سوابق رزرو
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "account"}
            className={tab === "account" ? "active" : ""}
            onClick={() => setTab("account")}
          >
            اطلاعات حساب
          </button>
        </div>

        {error && (
          <div className="acc-alert acc-alert--error" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {tab === "bookings" ? (
          <>
            <div className="pf-filters" role="tablist" aria-label="فیلتر رزروها">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={filter === item.key ? "active" : ""}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  <span>{fa(counts[item.key])}</span>
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="acc-empty">
                {bookings.length === 0
                  ? "هنوز رزروی ثبت نکرده‌اید."
                  : "رزروی در این دسته وجود ندارد."}
                {bookings.length === 0 && (
                  <Link className="acc-button acc-button--small" href="/booking">
                    رزرو بازی
                  </Link>
                )}
              </div>
            ) : (
              <div className="acc-grid">
                {visible.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={cancelBooking}
                    busy={busyId === booking.id}
                  />
                ))}
              </div>
            )}

            <p className="acc-note">
              برای لغو رزروِ پرداخت‌شده یا هر مشکل دیگری، با کد رهگیری با ما تماس
              بگیرید.
            </p>
          </>
        ) : (
          <div className="acc-columns">
            <section className="acc-card">
              <h2>اطلاعات شخصی</h2>

              <form onSubmit={saveName} className="acc-form">
                <label className="acc-field">
                  <span>نام و نام خانوادگی</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    required
                  />
                </label>

                <label className="acc-field">
                  <span>شماره موبایل</span>
                  <input value={customer.phone} dir="ltr" disabled />
                  <small>تغییر شماره‌ی موبایل فعلاً از طریق پشتیبانی انجام می‌شود.</small>
                </label>

                {nameMessage && (
                  <div
                    className={`acc-alert ${nameMessage.ok ? "acc-alert--ok" : "acc-alert--error"}`}
                    role="status"
                  >
                    {nameMessage.text}
                  </div>
                )}

                <button type="submit" className="acc-button" disabled={savingName}>
                  {savingName ? "در حال ذخیره..." : "ذخیره"}
                </button>
              </form>
            </section>

            <section className="acc-card">
              <h2>تغییر رمز عبور</h2>

              <form onSubmit={changePassword} className="acc-form">
                <label className="acc-field">
                  <span>رمز فعلی</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    dir="ltr"
                    autoComplete="current-password"
                    required
                  />
                </label>

                <label className="acc-field">
                  <span>رمز جدید</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className="acc-field">
                  <span>تکرار رمز جدید</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </label>

                {passMessage && (
                  <div
                    className={`acc-alert ${passMessage.ok ? "acc-alert--ok" : "acc-alert--error"}`}
                    role="status"
                  >
                    {passMessage.text}
                  </div>
                )}

                <button type="submit" className="acc-button" disabled={savingPass}>
                  {savingPass ? "در حال ذخیره..." : "تغییر رمز"}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
