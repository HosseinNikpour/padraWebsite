import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { can, requireStaff } from "@/lib/staff";

/** مشخصات پرسنل واردشده برای صفحه‌ی پروفایل */
export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const row = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      name: true,
      username: true,
      deviceCode: true,
      role: { select: { name: true } },
      supervisor: { select: { name: true } },
    },
  });

  const user = auth.user;

  return NextResponse.json(
    {
      // دسترسی‌های بخش پرسنل برای نمایش/مخفی کردن تب‌ها (اعمال واقعی سمت سرور است)
      can: {
        leaveSupervise: can(user, "leave.approve.supervisor"),
        leaveFinal: can(user, "leave.approve.final"),
        leaveViewAll: can(user, "leave.viewAll"),
        shiftsView: can(user, "shifts.view"),
        shiftsManage: can(user, "shifts.manage"),
        swapApprove: can(user, "shifts.swap.approve"),
        attendanceView: can(user, "attendance.view"),
        attendanceManage: can(user, "attendance.manage"),
      },
      me: row
        ? {
            id: auth.user.id,
            name: row.name,
            username: row.username,
            role: row.role.name,
            supervisor: row.supervisor?.name ?? null,
            deviceCode: row.deviceCode,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
