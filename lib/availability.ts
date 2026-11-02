/**
 * موتور نوبت‌بندی (بدون وابستگی به دیتابیس؛ هم در سرور و هم در مرورگر قابل استفاده است).
 *
 * ایده: به‌جای ذخیره‌ی تک‌تک نوبت‌ها در دیتابیس، فقط «قانون هفتگی» ذخیره می‌شود
 * (مثلاً جمعه از ۱۰:۰۰ تا ۱۵:۳۰) و نوبت‌ها هر بار از روی
 * مدت بازی + فاصله‌ی بین نوبت‌ها ساخته می‌شوند.
 */

export type TimeRange = { startTime: string; endTime: string };
export type Rule = TimeRange & {
  weekday: number;
  durationMinutes?: number | null;
  gapMinutes?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  capacity?: number | null;
  price?: number | null;
};
export type Slot = TimeRange;

/** weekday مطابق Date.getUTCDay(): 0=یکشنبه ... 5=جمعه، 6=شنبه. ترتیب نمایش: از شنبه. */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

export const BOOKING_WINDOW_DAYS = 7;
export const APP_TIME_ZONE = "Asia/Tehran";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);

  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;

  const d = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** روز هفته‌ی یک تاریخ «YYYY-MM-DD» (بدون وابستگی به منطقه‌ی زمانی). */
export function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

/** تاریخ و دقیقه‌ی فعلی به وقت تهران. */
export function nowInTehran(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * ساخت نوبت‌ها برای یک روز هفته.
 * مثال: ۱۰:۰۰ تا ۱۵:۳۰ با مدت ۲۰ و فاصله‌ی ۱۰ ←
 * ۱۰:۰۰-۱۰:۲۰ ، ۱۰:۳۰-۱۰:۵۰ ، ... ، ۱۵:۰۰-۱۵:۲۰
 * (نوبتی که از ساعت پایان بزند ساخته نمی‌شود)
 */
export function generateSlots(
  ranges: TimeRange[],
  durationMinutes: number,
  gapMinutes: number
): Slot[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];

  const gap = Math.max(0, gapMinutes || 0);
  const slots = new Map<string, Slot>();

  for (const range of ranges) {
    if (!isValidTime(range.startTime) || !isValidTime(range.endTime)) continue;

    const end = timeToMinutes(range.endTime);

    for (
      let current = timeToMinutes(range.startTime);
      current + durationMinutes <= end;
      current += durationMinutes + gap
    ) {
      const startTime = minutesToTime(current);

      slots.set(startTime, {
        startTime,
        endTime: minutesToTime(current + durationMinutes),
      });
    }
  }

  return [...slots.values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
}

export function slotsForDate(
  rules: Rule[],
  date: string,
  durationMinutes: number,
  gapMinutes: number
) {
  const weekday = weekdayOf(date);

  return generateSlots(
    rules.filter((rule) => rule.weekday === weekday),
    durationMinutes,
    gapMinutes
  );
}

/** اعتبارسنجی قوانین هفتگی؛ در صورت خطا پیام فارسی برمی‌گرداند. */
export function validateRules(rules: Rule[]): string | null {
  for (const rule of rules) {
    if (
      !Number.isInteger(rule.weekday) ||
      rule.weekday < 0 ||
      rule.weekday > 6
    ) {
      return "روز هفته نامعتبر است";
    }

    if (!isValidTime(rule.startTime) || !isValidTime(rule.endTime)) {
      return "ساعت‌ها باید با فرمت HH:mm باشند";
    }

    if (timeToMinutes(rule.endTime) <= timeToMinutes(rule.startTime)) {
      return "ساعت پایان باید بعد از ساعت شروع باشد";
    }
  }

  for (const day of WEEKDAYS) {
    const sorted = rules
      .filter((rule) => rule.weekday === day.value)
      .sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

    for (let i = 1; i < sorted.length; i++) {
      if (
        timeToMinutes(sorted[i].startTime) <
        timeToMinutes(sorted[i - 1].endTime)
      ) {
        return `بازه‌های روز ${day.label} با هم هم‌پوشانی دارند`;
      }
    }
  }

  return null;
}

/** اعداد فارسی/عربی را به انگلیسی تبدیل می‌کند. */
export function normalizeDigits(text: string) {
  return text
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}

/** از متنی مثل «۲۰ دقیقه» عدد دقیقه را می‌گیرد؛ اگر نبود null. */
export function parseMinutes(text: string): number | null {
  const match = normalizeDigits(text).match(/\d{1,3}/);

  if (!match) return null;

  const value = Number(match[0]);

  return value > 0 ? value : null;
}


/** تاریخ YYYY-MM-DD به Date در UTC نیمه‌شب (برای ستون‌های @db.Date) */
export function dbDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}
