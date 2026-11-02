"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import BookingCard, { type CustomerBooking } from "../account/BookingCard";

import "../account/account.css";

/**
 * پیگیری رزرو برای مهمان‌ها (موبایل + کد رهگیری).
 * مشتریِ واردشده مستقیم به /profile می‌رود که سوابق کامل رزروها آنجاست.
 */
export default function MyBookingsClient() {
  const [ready, setReady] = useState(false);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<CustomerBooking | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customer/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.customer) {
          window.location.replace("/profile");
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, []);

  async function submitLookup(event: React.FormEvent) {
    event.preventDefault();
    setLookup(null);
    setLookupError("");

    try {
      setLookupLoading(true);

      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, trackingCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLookupError(data.error || "رزروی پیدا نشد");
        return;
      }

      setLookup(data);
    } catch {
      setLookupError("ارتباط با سرور برقرار نشد");
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <main className="acc-page" dir="rtl">
      <div className="acc-container">
        <Link href="/" className="acc-brand">
          پادرا<span>پارک</span>
        </Link>

        <h1 className="acc-title">پیگیری رزرو</h1>

        {!ready ? (
          <div className="acc-empty">در حال دریافت...</div>
        ) : (
          <div className="acc-columns">
            <section className="acc-card">
              <h2>ورود به حساب</h2>
              <p>
                برای دیدن سوابق رزروها و مدیریت حساب، وارد شوید یا ثبت‌نام
                کنید.
              </p>
              <Link
                className="acc-button"
                href={`/account?next=${encodeURIComponent("/profile")}`}
              >
                ورود / ثبت‌نام
              </Link>
            </section>

            <section className="acc-card">
              <h2>پیگیری رزرو مهمان</h2>
              <p>شماره موبایل و کد رهگیری پیامک‌شده را وارد کنید.</p>

              <form onSubmit={submitLookup} className="acc-form">
                <label className="acc-field">
                  <span>شماره موبایل</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    inputMode="tel"
                    dir="ltr"
                    required
                  />
                </label>

                <label className="acc-field">
                  <span>کد رهگیری</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PDR-XXXXXX"
                    dir="ltr"
                    required
                  />
                </label>

                {lookupError && (
                  <div className="acc-alert acc-alert--error" role="alert">
                    {lookupError}
                  </div>
                )}

                <button type="submit" className="acc-button" disabled={lookupLoading}>
                  {lookupLoading ? "در حال جستجو..." : "پیگیری"}
                </button>
              </form>
            </section>

            {lookup && (
              <div className="acc-columns__full">
                <BookingCard booking={lookup} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
