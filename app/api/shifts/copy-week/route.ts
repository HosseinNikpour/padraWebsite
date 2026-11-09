import { NextResponse } from "next/server";

import { isValidDate } from "@/lib/availability";
import { addDaysStr, weekStart } from "@/lib/jalali";
import { prisma } from "@/lib/prisma";
import { can, dateStr, dbDate, fail, requireStaff } from "@/lib/staff";

/**
 * کپی شیفت‌های هفته‌ی قبل به یک هفته
 * POST { to: "YYYY-MM-DD" (هر روزِ هفته‌ی مقصد), mode: "preview" | "fill" | "replace" }
 *  preview : فقط تعداد شیفت‌های هفته‌ی قبل و شیفت‌های موجود در هفته‌ی مقصد را برمی‌گرداند
 *  fill    : فقط خانه‌های خالی هفته‌ی مقصد پر می‌شود (شیفت‌های موجود حفظ می‌شود)
 *  replace : شیفت‌های هفته‌ی مقصد حذف و با هفته‌ی قبل جایگزین می‌شود
 */
export async function POST(request: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    if (!can(auth.user, "shifts.manage")) return fail("دسترسی ندارید", 403);

    const body = await request.json().catch(() => ({}));
    const mode = body.mode;

    if (!isValidDate(body.to)) return fail("تاریخ هفته معتبر نیست");
    if (mode !== "preview" && mode !== "fill" && mode !== "replace") return fail("حالت کپی معتبر نیست");

    const toStart = weekStart(body.to);
    const toEnd = addDaysStr(toStart, 6);
    const fromStart = addDaysStr(toStart, -7);
    const fromEnd = addDaysStr(toStart, -1);

    const staffFilter = { isActive: true, role: { code: { not: "CUSTOMER" } } };

    const [source, target] = await Promise.all([
      prisma.shift.findMany({
        where: { date: { gte: dbDate(fromStart), lte: dbDate(fromEnd) }, user: staffFilter },
        select: { userId: true, date: true, type: true },
      }),
      prisma.shift.findMany({
        where: { date: { gte: dbDate(toStart), lte: dbDate(toEnd) }, user: staffFilter },
        select: { userId: true, date: true },
      }),
    ]);

    if (mode === "preview") {
      return NextResponse.json({ sourceCount: source.length, targetCount: target.length, from: fromStart, to: toStart });
    }

    if (source.length === 0) return fail("برای هفته‌ی قبل شیفتی ثبت نشده است");

    const taken = new Set(target.map((t) => `${t.userId}|${dateStr(t.date)}`));

    const rows = source
      .map((s) => ({ userId: s.userId, date: addDaysStr(dateStr(s.date), 7), type: s.type }))
      .filter((r) => mode === "replace" || !taken.has(`${r.userId}|${r.date}`));

    await prisma.$transaction([
      ...(mode === "replace"
        ? [prisma.shift.deleteMany({ where: { date: { gte: dbDate(toStart), lte: dbDate(toEnd) }, user: staffFilter } })]
        : []),
      prisma.shift.createMany({
        data: rows.map((r) => ({ userId: r.userId, date: dbDate(r.date), type: r.type })),
        skipDuplicates: true,
      }),
    ]);

    return NextResponse.json({ success: true, copied: rows.length, skipped: source.length - rows.length });
  } catch (error) {
    console.error("SHIFTS COPY WEEK ERROR:", error);

    return fail("خطا در کپی شیفت‌ها", 500);
  }
}
