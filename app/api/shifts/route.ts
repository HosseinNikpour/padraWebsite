import { NextResponse } from "next/server";

import { isValidDate } from "@/lib/availability";
import { diffDays } from "@/lib/jalali";
import { isShiftType } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { can, dbDate, fail, loadShiftMap, requireStaff } from "@/lib/staff";

const MAX_RANGE_DAYS = 62;

/**
 * GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD&scope=mine|team
 *  mine : شیفت‌های خودم (مرخصی تأییدشده با اولویت)
 *  team : شیفت همه‌ی پرسنل (نیازمند shifts.view)
 */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const sp = new URL(request.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const scope = sp.get("scope") ?? "mine";

  if (!isValidDate(from) || !isValidDate(to) || to < from) return fail("بازه‌ی تاریخ نامعتبر است");
  if (diffDays(to, from) + 1 > MAX_RANGE_DAYS) return fail("بازه‌ی انتخابی بیش از حد بزرگ است");

  if (scope === "team") {
    if (!can(user, "shifts.view")) return fail("دسترسی ندارید", 403);

    const [staff, map] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, role: { code: { not: "CUSTOMER" } } },
        select: { id: true, name: true, supervisorId: true, role: { select: { name: true } } },
        orderBy: [{ name: "asc" }],
      }),
      loadShiftMap(null, from, to),
    ]);

    const cells = [...map.entries()].map(([key, type]) => {
      const [userId, date] = key.split("|");

      return { userId: Number(userId), date, type };
    });

    return NextResponse.json(
      {
        staff: staff.map((s) => ({ id: s.id, name: s.name, role: s.role.name, supervisorId: s.supervisorId })),
        cells,
        canManage: can(user, "shifts.manage"),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const map = await loadShiftMap([user.id], from, to);
  const cells = [...map.entries()].map(([key, type]) => ({ date: key.split("|")[1], type }));

  return NextResponse.json({ cells }, { headers: { "Cache-Control": "no-store" } });
}

/** PUT { cells: [{ userId, date, type: "FULL"|"AM"|"PM"|"LEAVE"|"ABSENT"|null }] } — ثبت/ویرایش شیفت‌ها (null = حذف) */
export async function PUT(request: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    if (!can(auth.user, "shifts.manage")) return fail("دسترسی ندارید", 403);

    const body = await request.json();
    const cells: { userId: number; date: string; type: string | null }[] = Array.isArray(body.cells)
      ? body.cells
      : [];

    if (cells.length === 0 || cells.length > 600) return fail("تعداد خانه‌ها معتبر نیست");

    for (const c of cells) {
      if (!Number.isInteger(c.userId) || !isValidDate(c.date) || (c.type !== null && !isShiftType(c.type))) {
        return fail("اطلاعات یکی از خانه‌ها معتبر نیست");
      }
    }

    const ids = [...new Set(cells.map((c) => c.userId))];
    const existing = await prisma.user.count({ where: { id: { in: ids }, isActive: true, role: { code: { not: "CUSTOMER" } } } });

    if (existing !== ids.length) return fail("یکی از پرسنل پیدا نشد یا غیرفعال است");

    await prisma.$transaction(
      cells.map((c) =>
        c.type === null
          ? prisma.shift.deleteMany({ where: { userId: c.userId, date: dbDate(c.date) } })
          : prisma.shift.upsert({
              where: { userId_date: { userId: c.userId, date: dbDate(c.date) } },
              update: { type: c.type },
              create: { userId: c.userId, date: dbDate(c.date), type: c.type },
            })
      )
    );

    return NextResponse.json({ success: true, count: cells.length });
  } catch (error) {
    console.error("SHIFTS SAVE ERROR:", error);

    return fail("خطا در ذخیره‌ی شیفت‌ها", 500);
  }
}
