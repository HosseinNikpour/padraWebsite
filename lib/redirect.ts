// منطق خالص مقصد بعد از ورود (بدون وابستگی به سرور؛ قابل تست)

export type SessionType = "staff" | "customer";

export const STAFF_HOME = "/admin";
export const CUSTOMER_HOME = "/profile";

/**
 * مقصد بعد از ورود، بر اساس نوع کاربر:
 *  - پرسنل: اگر مسیر درخواستی (مثلاً صفحه‌ی رزرو) داشته باشند همان‌جا برمی‌گردند؛ پیش‌فرض پنل مدیریت
 *  - مشتری: هرگز داخل /admin؛ پیش‌فرض پروفایل
 * فقط مسیرهای داخلی سایت پذیرفته می‌شود (جلوگیری از open redirect).
 */
export function resolveRedirect(type: SessionType, next: string | null | undefined) {
  const safe =
    next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : null;

  if (type === "staff") {
    return safe && safe !== "/account" && !safe.startsWith("/account?") ? safe : STAFF_HOME;
  }

  return safe && safe !== "/admin" && !safe.startsWith("/admin/") ? safe : CUSTOMER_HOME;
}
