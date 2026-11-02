import { normalizeDigits } from "@/lib/availability";

/**
 * تنها منبع نرمال‌سازی و اعتبارسنجی شماره موبایل (هم سرور هم مرورگر).
 * هیچ‌جای دیگری نباید regex موبایل بنویسد؛ از این توابع استفاده کنید.
 */
export const PHONE_EXAMPLE = "09123456789";
export const PHONE_ERROR = `شماره موبایل معتبر نیست (مثال: ${PHONE_EXAMPLE})`;

const PHONE_RE = /^09\d{9}$/;

/** شماره‌ی موبایل را به فرمت استاندارد 09xxxxxxxxx تبدیل می‌کند (اعداد فارسی/عربی، فاصله، خط تیره و +98 پشتیبانی می‌شود). */
export function normalizePhone(value: unknown) {
  let phone = normalizeDigits(String(value ?? "")).replace(/[\s\-()]/g, "");

  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  else if (/^9\d{9}$/.test(phone)) phone = "0" + phone;

  return phone;
}

export function isValidPhone(phone: string) {
  return PHONE_RE.test(phone);
}

/** نرمال‌سازی + اعتبارسنجی در یک قدم: شماره‌ی استاندارد، یا null اگر معتبر نبود. */
export function parsePhone(value: unknown): string | null {
  const phone = normalizePhone(value);

  return isValidPhone(phone) ? phone : null;
}
