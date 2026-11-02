import { NextResponse } from "next/server";

import { computeDay, normalizeDeviceCode, summarize, type DayResult } from "@/lib/attendance";
import { nowInTehran } from "@/lib/availability";
import { addDaysStr, monthRange } from "@/lib/jalali";
import { prisma } from "@/lib/prisma";
import { can, dateStr, dbDate, fail, loadShiftMap, requireStaff, shiftKey } from "@/lib/staff";

/**
 * کارکرد و حضور و غیاب یک ماه شمسی
 *   GET ?year=1405&month=7              ← خلاصه‌ی همه‌ی پرسنل (attendance.view) یا فقط خودم
 *   GET ?year=1405&month=7&userId=5     ← ریز روزانه‌ی یک نفر (خودم یا با attendance.view)
 */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const sp = new URL(request.url).searchParams;
  const jy = Number(sp.get("year"));
  const jm = Number(sp.get("month"));

  if (!Number.isInteger(jy) || jy < 1380 || jy > 1500 || !Number.isInteger(jm) || jm < 1 || jm > 12) {
    return fail("ماه نامعتبر است");
  }

  const viewAll = can(user, "attendance.view");
  const wantedId = sp.get("userId") ? Number(sp.get("userId")) : null;

  if (wantedId !== null && wantedId !== user.id && !viewAll) return fail("دسترسی ندارید", 403);

  const users = await prisma.user.findMany({
    where: wantedId !== null ? { id: wantedId } : viewAll ? { isActive: true, role: { code: { not: "CUSTOMER" } } } : { id: user.id },
    select: { id: true, name: true, deviceCode: true, role: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const range = monthRange(jy, jm);
  const today = nowInTehran();
  const ids = users.map((u) => u.id);
  const shiftMap = await loadShiftMap(ids, range.start, range.end);

  const codes = users.map((u) => (u.deviceCode ? normalizeDeviceCode(u.deviceCode) : null)).filter((c): c is string => !!c);

  const logs = codes.length
    ? await prisma.attendanceLog.findMany({
        where: { deviceUserCode: { in: codes }, punchDate: { gte: dbDate(range.start), lte: dbDate(range.end) } },
        select: { deviceUserCode: true, punchDate: true, punchTime: true },
      })
    : [];

  const punchMap = new Map<string, string[]>();

  for (const log of logs) {
    const key = `${log.deviceUserCode}|${dateStr(log.punchDate)}`;

    (punchMap.get(key) ?? punchMap.set(key, []).get(key)!).push(log.punchTime);
  }

  const rows = users.map((u) => {
    const code = u.deviceCode ? normalizeDeviceCode(u.deviceCode) : null;
    const days: DayResult[] = [];

    for (let i = 0; i < range.days; i++) {
      const date = addDaysStr(range.start, i);

      days.push(
        computeDay({
          date,
          punches: code ? (punchMap.get(`${code}|${date}`) ?? []) : [],
          shift: shiftMap.get(shiftKey(u.id, date)) ?? null,
          today: today.date,
          nowMinutes: today.minutes,
        })
      );
    }

    return { user: { id: u.id, name: u.name, role: u.role.name, deviceCode: u.deviceCode }, summary: summarize(days), days };
  });

  if (wantedId !== null) {
    return NextResponse.json({ range, row: rows[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { range, viewAll, rows: rows.map(({ days, ...rest }) => { void days; return rest; }) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
