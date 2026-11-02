"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import "./account.css";

/**
 * ورود یکپارچه: پرسنل (نام کاربری) و مشتری (شماره موبایل) از همین فرم وارد می‌شوند
 * و سرور تعیین می‌کند هر کدام به کدام صفحه بروند (پنل مدیریت یا پروفایل).
 * ثبت‌نام فقط برای مشتری است.
 */
export default function AccountClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // اگر قبلاً وارد شده، مستقیم به صفحه‌ی خودش برود
  useEffect(() => {
    fetch(`/api/session?next=${encodeURIComponent(next)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.type && data.redirect) {
          window.location.replace(data.redirect);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [next]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response =
        mode === "login"
          ? await fetch("/api/auth/signin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifier, password, next }),
            })
          : await fetch("/api/customer/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, phone: identifier, password, next }),
            });

      // بعضی خطاهای Next.js ممکن است پاسخ HTML یا بدنه‌ی خالی برگردانند؛
      // در این حالت خطای JSON نباید به‌اشتباه «عدم ارتباط با سرور» نمایش داده شود.
      const responseText = await response.text();
      let data: { error?: string; redirect?: string; type?: "staff" | "customer" } = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error("SIGNIN_NON_JSON_RESPONSE", {
          status: response.status,
          body: responseText.slice(0, 500),
        });
        setError(`پاسخ نامعتبر از سرور دریافت شد (HTTP ${response.status}). ترمینال اجرای پروژه را بررسی کنید.`);
        return;
      }

      if (!response.ok) {
        setError(data.error || `ورود ناموفق بود (HTTP ${response.status})`);
        return;
      }

      // API ورود مقصد را برمی‌گرداند؛ درخواست اضافی به /api/session لازم نیست.
      // درخواست اضافی قبلی می‌توانست بعد از ورود موفق خطا بدهد و کل ورود را ناموفق نشان دهد.
      const fallback = data.type === "staff" ? "/admin" : "/profile";
      window.location.replace(data.redirect || fallback);
    } catch (error) {
      console.error("SIGNIN_NETWORK_ERROR:", error);
      setError("درخواست ورود به سرور نرسید. مطمئن شوید npm run dev بدون خطا در حال اجراست و سپس دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="acc-page" dir="rtl">
        <div className="acc-container acc-container--narrow">
          <div className="acc-empty">در حال بررسی...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="acc-page" dir="rtl">
      <div className="acc-container acc-container--narrow">
        <Link href="/" className="acc-brand">
          پادرا<span>پارک</span>
        </Link>

        <section className="acc-card">
          <div className="acc-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              ورود
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              ثبت‌نام
            </button>
          </div>

          <form onSubmit={submit} className="acc-form">
            {mode === "register" && (
              <label className="acc-field">
                <span>نام و نام خانوادگی</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="acc-field">
              <span>{mode === "login" ? "شماره موبایل یا نام کاربری" : "شماره موبایل"}</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={mode === "login" ? "09123456789 یا نام کاربری" : "09123456789"}
                inputMode={mode === "register" ? "tel" : "text"}
                dir="ltr"
                autoComplete={mode === "login" ? "username" : "tel"}
                autoCapitalize="none"
                required
              />
              {mode === "login" && (
                <small>مشتریان با شماره موبایل و پرسنل با نام کاربری وارد می‌شوند.</small>
              )}
            </label>

            <label className="acc-field">
              <span>رمز عبور</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              {mode === "register" && <small>حداقل ۸ کاراکتر</small>}
            </label>

            {error && (
              <div className="acc-alert acc-alert--error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="acc-button" disabled={loading}>
              {loading ? "لطفاً صبر کنید..." : mode === "login" ? "ورود" : "ایجاد حساب"}
            </button>
          </form>

          <p className="acc-note">
            بدون ثبت‌نام هم می‌توانید رزرو کنید؛ در صفحه‌ی رزرو گزینه‌ی «مهمان» وجود دارد.
          </p>
        </section>
      </div>
    </main>
  );
}
