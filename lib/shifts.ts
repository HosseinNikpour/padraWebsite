/** انواع شیفت، رنگ‌ها و ساعت‌ها (قابل استفاده در سرور و مرورگر) */

export type ShiftType = "FULL" | "AM" | "PM" | "LEAVE" | "ABSENT";

export const SHIFT_TYPES: ShiftType[] = ["FULL", "AM", "PM", "LEAVE"];
export const TEAM_SHIFT_TYPES: ShiftType[] = [...SHIFT_TYPES, "ABSENT"];

export const SHIFT_META: Record<
  ShiftType,
  { label: string; title: string; start?: string; end?: string; color: string; bg: string }
> = {
  FULL: { label: "Full", title: "تمام‌وقت", start: "10:00", end: "23:30", color: "#1d6fd1", bg: "#e1efff" },
  AM: { label: "AM", title: "صبح", start: "10:00", end: "16:45", color: "#1b8a4b", bg: "#def5e8" },
  PM: { label: "PM", title: "عصر", start: "16:45", end: "23:30", color: "#9a7400", bg: "#fff3c4" },
  LEAVE: { label: "مرخصی", title: "مرخصی", color: "#d9650b", bg: "#ffe6d0" },
  ABSENT: { label: "غیبت", title: "غیبت ثبت‌شده", color: "#b42318", bg: "#fee4e2" },
};

export function isShiftType(value: unknown): value is ShiftType {
  return typeof value === "string" && (SHIFT_TYPES as string[]).includes(value);
}

export function shiftRangeText(type: ShiftType) {
  const m = SHIFT_META[type];

  return m.start && m.end ? `${m.start}–${m.end}` : "";
}

/**
 * ترکیب شیفتی که فرد از قبل دارد با شیفتی که جایگزین می‌شود به‌عهده بگیرد.
 * مثال: صبح + عصر = تمام‌وقت. اگر فرد مرخصی باشد تداخل است.
 */
export function mergeShifts(
  existing: ShiftType | null | undefined,
  added: Exclude<ShiftType, "LEAVE">
): ShiftType | "CONFLICT" {
  if (!existing) return added;
  if (existing === "LEAVE" || existing === "ABSENT") return "CONFLICT";
  if (existing === added) return existing;
  if (existing === "FULL" || added === "FULL") return "FULL";

  return "FULL"; // AM + PM
}

/** شیفت مؤثر یک روز: مرخصی تأییدشده روی هر شیفتی اولویت دارد. */
export function effectiveShift(
  rowType: string | null | undefined,
  onApprovedLeave: boolean
): ShiftType | null {
  if (onApprovedLeave) return "LEAVE";

  return isShiftType(rowType) ? rowType : null;
}
