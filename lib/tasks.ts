/** منطق خالص تسک‌ها (بدون DB؛ قابل تست و قابل استفاده در مرورگر). */
export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام‌شده",
};

export const MAX_TASK_NOTE = 1000;
export const MAX_ASSIGNEES = 200;

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

/** شناسه‌ی انجام‌دهنده‌ها: عدد صحیح مثبت، بدون تکرار. اگر ورودی آرایه نباشد null. */
export function parseAssigneeIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const ids = new Set<number>();

  for (const item of value) {
    const id = Number(item);

    if (Number.isInteger(id) && id > 0) ids.add(id);
  }

  return [...ids].slice(0, MAX_ASSIGNEES);
}

export type TaskUpdateInput = { status?: unknown; note?: unknown };
export type TaskUpdateResult =
  | { ok: true; status: TaskStatus; note: string | null; statusChanged: boolean }
  | { ok: false; error: string };

/**
 * گزارش روزانه‌ی انجام‌دهنده: وضعیت اختیاری است (پیش‌فرض همان وضعیت فعلی)، توضیح اختیاری،
 * ولی حداقل یکی از «توضیح» یا «تغییر وضعیت» لازم است.
 */
export function validateTaskUpdate(input: TaskUpdateInput, current: TaskStatus): TaskUpdateResult {
  if (input.status !== undefined && input.status !== null && input.status !== "" && !isTaskStatus(input.status)) {
    return { ok: false, error: "وضعیت تسک نامعتبر است" };
  }

  const status = isTaskStatus(input.status) ? input.status : current;
  const note = typeof input.note === "string" ? input.note.trim() : "";

  if (note.length > MAX_TASK_NOTE) {
    return { ok: false, error: `توضیحات حداکثر ${MAX_TASK_NOTE} کاراکتر باشد` };
  }

  const statusChanged = status !== current;

  if (!note && !statusChanged) {
    return { ok: false, error: "توضیحات را بنویسید یا وضعیت را تغییر دهید" };
  }

  return { ok: true, status, note: note || null, statusChanged };
}
