import { SHIFT_META, shiftMinutes, type ShiftType } from "@/lib/shifts";
import { parseAnyDate } from "@/lib/jalali";

/* ------------------------------------------------------------------ */
/* خواندن فایل/متن تردد دستگاه                                         */
/* ------------------------------------------------------------------ */

export type ParsedPunch = {
  code: string;
  date: string; // YYYY-MM-DD میلادی
  time: string; // HH:mm:ss
  direction: "IN" | "OUT" | null;
};

export type ParseResult = {
  records: ParsedPunch[];
  errors: { line: number; text: string; reason: string }[];
};

const DATETIME_RE =
  /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/;

const norm = (s: string) =>
  s
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));

/** کد کاربر دستگاه: صفرهای ابتدایی حذف می‌شود (007 = 7) تا با کد ثبت‌شده‌ی پرسنل یکی شود */
export function normalizeDeviceCode(code: string) {
  return norm(code).trim().replace(/^0+(?=\d)/, "");
}

function directionOf(tokens: string[]): "IN" | "OUT" | null {
  for (const t of tokens) {
    if (/^(in|checkin|ورود)$/i.test(t)) return "IN";
    if (/^(out|checkout|خروج)$/i.test(t)) return "OUT";
  }

  return null;
}

/**
 * هر خط باید شامل «کد کاربر» و «تاریخ + ساعت» باشد. فرمت‌های رایج خروجی دستگاه‌ها پشتیبانی می‌شود:
 *   1<TAB>2026-10-21 10:03:12<TAB>1<TAB>0
 *   12,1405/07/29,10:03
 *   12;2026-10-21 10:03:12;IN
 * تاریخ شمسی (سال < ۱۷۰۰) خودکار به میلادی تبدیل می‌شود. خط عنوان نادیده گرفته می‌شود.
 */
export function parsePunchText(text: string): ParseResult {
  const records: ParsedPunch[] = [];
  const errors: ParseResult["errors"] = [];

  norm(text)
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();

      if (!line) return;

      // «تاریخ ساعت» یا «تاریخ , ساعت» (جدا شده با جداکننده)
      const joined = line.replace(
        /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s*[,;\t|]\s*(\d{1,2}:\d{2}(?::\d{2})?)/,
        "$1 $2"
      );

      const m = joined.match(DATETIME_RE);

      if (!m) {
        // خط عنوان (بدون هیچ رقم تاریخ) بی‌صدا رد می‌شود
        if (index > 0 || /\d/.test(line)) {
          errors.push({ line: index + 1, text: line.slice(0, 80), reason: "تاریخ/ساعت پیدا نشد" });
        }

        return;
      }

      const date = parseAnyDate(m[1]);

      if (!date) {
        errors.push({ line: index + 1, text: line.slice(0, 80), reason: "تاریخ نامعتبر" });

        return;
      }

      const hh = Number(m[2]);
      const mm = Number(m[3]);
      const ss = Number(m[4] ?? 0);

      if (hh > 23 || mm > 59 || ss > 59) {
        errors.push({ line: index + 1, text: line.slice(0, 80), reason: "ساعت نامعتبر" });

        return;
      }

      const rest = joined
        .replace(m[0], " ")
        .split(/[,\t;|\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const codeToken = rest.find((t) => /^[A-Za-z0-9_-]+$/.test(t) && !/^(in|out|checkin|checkout)$/i.test(t));

      if (!codeToken) {
        errors.push({ line: index + 1, text: line.slice(0, 80), reason: "کد کاربر پیدا نشد" });

        return;
      }

      const code = normalizeDeviceCode(codeToken);

      records.push({
        code,
        date,
        time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
        direction: directionOf(rest),
      });
    });

  return { records, errors };
}

/* ------------------------------------------------------------------ */
/* محاسبه‌ی کارکرد روزانه                                              */
/* ------------------------------------------------------------------ */

export const GRACE_MINUTES = 10; // تأخیر/تعجیل تا این مقدار محاسبه نمی‌شود
export const OVERTIME_THRESHOLD = 15; // اضافه‌کار کمتر از این مقدار حساب نمی‌شود
const DEDUPE_SECONDS = 120; // دو تردد نزدیک‌تر از این، یکی حساب می‌شود (دوبار زدن کارت)

export type DayStatus =
  | "PRESENT"
  | "INCOMPLETE"
  | "ABSENT"
  | "LEAVE"
  | "OFF"
  | "UNSCHEDULED"
  | "PENDING"
  | "FUTURE";

export type DayResult = {
  date: string;
  status: DayStatus;
  shift: ShiftType | null;
  punches: string[];
  firstIn: string | null;
  lastOut: string | null;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
};

export const toSeconds = (t: string) => {
  const [h, m, s] = t.split(":").map(Number);

  return h * 3600 + m * 60 + (s || 0);
};

const toMinutes = (t: string) => Math.floor(toSeconds(t) / 60);

function dedupePunches(times: string[]) {
  const sorted = [...times].sort();
  const result: string[] = [];

  for (const t of sorted) {
    if (result.length && toSeconds(t) - toSeconds(result[result.length - 1]) < DEDUPE_SECONDS) continue;

    result.push(t);
  }

  return result;
}

export function computeDay(input: {
  date: string;
  punches: string[];
  shift: ShiftType | null;
  today: string;
  nowMinutes?: number;
}): DayResult {
  const { date, shift, today } = input;
  const punches = dedupePunches(input.punches);
  const meta = shift && shift !== "LEAVE" ? SHIFT_META[shift] : null;
  const shiftStart = meta?.start ? toMinutes(meta.start) : null;
  const shiftEnd = meta?.end ? toMinutes(meta.end) : null;
  const expectedMinutes = shiftStart !== null && shiftEnd !== null ? shiftEnd - shiftStart : 0;

  const base: DayResult = {
    date,
    status: "OFF",
    shift,
    punches,
    firstIn: punches[0] ?? null,
    lastOut: null,
    workedMinutes: 0,
    expectedMinutes,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
  };

  // جفت کردن ورود/خروج به‌ترتیب
  let worked = 0;

  for (let i = 0; i + 1 < punches.length; i += 2) {
    worked += Math.max(0, Math.round((toSeconds(punches[i + 1]) - toSeconds(punches[i])) / 60));
  }

  const incomplete = punches.length % 2 === 1;

  base.workedMinutes = worked;
  base.lastOut = punches.length >= 2 ? punches[incomplete ? punches.length - 2 : punches.length - 1] : null;

  if (date > today) return { ...base, status: "FUTURE" };

  if (shift === "LEAVE") return { ...base, status: "LEAVE" };
  if (shift === "ABSENT") return { ...base, status: "ABSENT" };

  if (punches.length === 0) {
    if (!meta) return { ...base, status: "OFF" };

    const ended =
      date < today || (input.nowMinutes !== undefined && shiftEnd !== null && input.nowMinutes > shiftEnd);

    return { ...base, status: ended ? "ABSENT" : "PENDING" };
  }

  if (!meta) return { ...base, status: "UNSCHEDULED" };

  const first = toMinutes(punches[0]);

  if (shiftStart !== null && first > shiftStart + GRACE_MINUTES) base.lateMinutes = first - shiftStart;

  const dayFinished = date < today;

  if (!incomplete && base.lastOut && shiftEnd !== null) {
    const last = toMinutes(base.lastOut);

    if (last < shiftEnd - GRACE_MINUTES) base.earlyLeaveMinutes = shiftEnd - last;
  }

  if (worked > expectedMinutes + OVERTIME_THRESHOLD) base.overtimeMinutes = worked - expectedMinutes;

  return {
    ...base,
    // امروز با یک تردد یعنی هنوز در محل کار است، نه ناقص
    status: incomplete && (dayFinished || date === today ? dayFinished : true) ? "INCOMPLETE" : "PRESENT",
  };
}

export type MonthSummary = {
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  incompleteDays: number;
  lateDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  scheduledDays: number;
  /** تعداد شیفت‌های ثبت‌شده در ماه (طبق برنامه‌ی شیفت) */
  shiftFull: number;
  shiftAm: number;
  shiftPm: number;
  shiftOff: number;
  shiftLeave: number;
  /** جمع ساعات شیفت‌های ثبت‌شده (دقیقه) */
  scheduledMinutes: number;
};

export function summarize(days: DayResult[]): MonthSummary {
  const s: MonthSummary = {
    presentDays: 0, absentDays: 0, leaveDays: 0, incompleteDays: 0, lateDays: 0,
    lateMinutes: 0, earlyLeaveMinutes: 0, workedMinutes: 0, overtimeMinutes: 0, scheduledDays: 0,
    shiftFull: 0, shiftAm: 0, shiftPm: 0, shiftOff: 0, shiftLeave: 0, scheduledMinutes: 0,
  };

  for (const d of days) {
    if (d.shift === "FULL") s.shiftFull++;
    if (d.shift === "AM") s.shiftAm++;
    if (d.shift === "PM") s.shiftPm++;
    if (d.shift === "ABSENT") s.shiftOff++;
    if (d.shift === "LEAVE") s.shiftLeave++;

    s.scheduledMinutes += shiftMinutes(d.shift);

    if (d.shift && d.shift !== "LEAVE" && d.status !== "FUTURE") s.scheduledDays++;
    if (d.status === "PRESENT" || d.status === "UNSCHEDULED") s.presentDays++;
    if (d.status === "ABSENT") s.absentDays++;
    if (d.status === "LEAVE") s.leaveDays++;
    if (d.status === "INCOMPLETE") s.incompleteDays++;
    if (d.lateMinutes > 0) s.lateDays++;

    s.lateMinutes += d.lateMinutes;
    s.earlyLeaveMinutes += d.earlyLeaveMinutes;
    s.workedMinutes += d.workedMinutes;
    s.overtimeMinutes += d.overtimeMinutes;
  }

  return s;
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${h.toLocaleString("fa-IR")}:${String(m).padStart(2, "0").replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"))}`;
}
