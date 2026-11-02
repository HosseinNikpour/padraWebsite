import { NextResponse } from "next/server";

import { getCurrentUser, hasPermission, isAdminRole, type CurrentUser } from "@/lib/auth";
import { effectiveShift, type ShiftType } from "@/lib/shifts";
import { dbDate } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** فقط نیاز به ورود پرسنل دارد (کارهای شخصی: مرخصی خودم، شیفت خودم، ...). */
export async function requireStaff(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) return { ok: false, response: fail("ابتدا وارد شوید", 401) };

  return { ok: true, user };
}

export const can = (user: CurrentUser, code: string) => hasPermission(user, code);

/** مدیر مجموعه (یا مدیر سیستم): همه‌ی تسک‌ها را می‌بیند و می‌تواند به همه‌ی پرسنل تسک بدهد. */
export const isTaskManager = (user: CurrentUser) => isAdminRole(user.role) || can(user, "leave.approve.final");

/** مدیر مجموعه یا سوپروایزر می‌تواند تسک ایجاد و به پرسنل محول کند. */
export const canAssignTasks = (user: CurrentUser) => isTaskManager(user) || can(user, "leave.approve.supervisor");

export { dbDate } from "@/lib/availability";
export const dateStr = (d: Date) => d.toISOString().slice(0, 10);

/** کلید نقشه‌ی شیفت */
export const shiftKey = (userId: number, date: string) => `${userId}|${date}`;

/**
 * شیفت مؤثر هر نفر در هر روز: ردیف Shift + مرخصی تأییدشده (که اولویت دارد).
 * userIds = null یعنی همه.
 */
export async function loadShiftMap(
  userIds: number[] | null,
  from: string,
  to: string
): Promise<Map<string, ShiftType>> {
  const userFilter = userIds ? { in: userIds } : undefined;

  const [rows, leaves] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: dbDate(from), lte: dbDate(to) }, ...(userFilter ? { userId: userFilter } : {}) },
      select: { userId: true, date: true, type: true },
    }),
    prisma.leaveDay.findMany({
      where: {
        date: { gte: dbDate(from), lte: dbDate(to) },
        leaveRequest: { status: "APPROVED", ...(userFilter ? { userId: userFilter } : {}) },
      },
      select: { date: true, leaveRequest: { select: { userId: true } } },
    }),
  ]);

  const map = new Map<string, ShiftType>();

  for (const row of rows) {
    const type = effectiveShift(row.type, false);

    if (type) map.set(shiftKey(row.userId, dateStr(row.date)), type);
  }

  for (const leave of leaves) {
    map.set(shiftKey(leave.leaveRequest.userId, dateStr(leave.date)), "LEAVE");
  }

  return map;
}
