/**
 * تبدیل تاریخ شمسی ↔ میلادی بر پایه‌ی Intl (تقویم persian در ICU مرورگر و Node).
 * تاریخ‌ها همیشه به‌صورت رشته‌ی میلادی «YYYY-MM-DD» (بدون منطقه‌ی زمانی) جابه‌جا می‌شوند.
 */

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** نام روزها به ترتیب شمسی: شنبه ... جمعه */
export const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

const pad = (n: number) => String(n).padStart(2, "0");

export type Jalali = { jy: number; jm: number; jd: number };

export function utcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function dateToString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDaysStr(date: string, days: number) {
  const d = utcDate(date);

  d.setUTCDate(d.getUTCDate() + days);

  return dateToString(d);
}

export function diffDays(a: string, b: string) {
  return Math.round((utcDate(a).getTime() - utcDate(b).getTime()) / 86_400_000);
}

export function toJalali(date: string): Jalali {
  const parts = formatter.formatToParts(utcDate(date));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return { jy: get("year"), jm: get("month"), jd: get("day") };
}

const ordinal = (j: Jalali) => j.jy * 372 + (j.jm - 1) * 31 + j.jd;

export function toGregorian(jy: number, jm: number, jd: number): string {
  const monthOffset = jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30;
  let candidate = dateToString(new Date(Date.UTC(jy + 621, 2, 21 + monthOffset + (jd - 1))));

  for (let i = 0; i < 6; i++) {
    const j = toJalali(candidate);
    const delta = ordinal({ jy, jm, jd }) - ordinal(j);

    if (delta === 0) return candidate;

    // اختلاف ordinal تقریبی است؛ فقط جهت و اندازه‌ی کوچک مهم است
    candidate = addDaysStr(candidate, Math.sign(delta) * Math.max(1, Math.min(Math.abs(delta), 5)));
  }

  return candidate;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;

  return diffDays(toGregorian(jy + 1, 1, 1), toGregorian(jy, 12, 1));
}

/** روز هفته با شروع شنبه: شنبه=0 ... جمعه=6 */
export function weekdayIndex(date: string) {
  return (utcDate(date).getUTCDay() + 1) % 7;
}

export function weekStart(date: string) {
  return addDaysStr(date, -weekdayIndex(date));
}

export function monthRange(jy: number, jm: number) {
  const days = jalaliMonthLength(jy, jm);

  return { start: toGregorian(jy, jm, 1), end: toGregorian(jy, jm, days), days };
}

export function formatJalali(date: string, withWeekday = false) {
  const { jy, jm, jd } = toJalali(date);
  const base = `${jd.toLocaleString("fa-IR")} ${JALALI_MONTHS[jm - 1]} ${jy.toLocaleString("fa-IR", { useGrouping: false })}`;

  return withWeekday ? `${WEEKDAY_NAMES[weekdayIndex(date)]} ${base}` : base;
}

export function jalaliShort(date: string) {
  const { jm, jd } = toJalali(date);

  return `${jd.toLocaleString("fa-IR")} ${JALALI_MONTHS[jm - 1]}`;
}

/** «1405/07/29» یا «۱۴۰۵/۷/۲۹» (یا میلادی «2026-10-21») → «YYYY-MM-DD» میلادی؛ نامعتبر = null */
export function parseAnyDate(text: string): string | null {
  const normalized = text
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));

  const m = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!m) return null;

  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  if (y < 1700) {
    if (d > jalaliMonthLength(y, mo)) return null;

    return toGregorian(y, mo, d);
  }

  const iso = `${y}-${pad(mo)}-${pad(d)}`;

  return dateToString(utcDate(iso)) === iso ? iso : null;
}
