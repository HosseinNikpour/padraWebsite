import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, isAdminRole } from "@/lib/auth";

const staffPermissions = [
  { name: "تأیید مرخصی (سوپروایزر)", code: "leave.approve.supervisor", description: "تأیید مرحله اول درخواست مرخصی پرسنل" },
  { name: "تأیید نهایی مرخصی (مدیر)", code: "leave.approve.final", description: "تأیید نهایی درخواست مرخصی" },
  { name: "مشاهده همه مرخصی‌ها", code: "leave.viewAll", description: "مشاهده درخواست‌های مرخصی همه پرسنل" },
  { name: "مشاهده شیفت همه پرسنل", code: "shifts.view", description: "مشاهده تقویم شیفت پرسنل" },
  { name: "مدیریت شیفت‌ها", code: "shifts.manage", description: "ثبت و ویرایش شیفت پرسنل" },
  { name: "تأیید جابه‌جایی شیفت", code: "shifts.swap.approve", description: "تأیید یا رد درخواست جابه‌جایی شیفت" },
  { name: "مشاهده حضور و غیاب همه", code: "attendance.view", description: "مشاهده حضور و غیاب پرسنل" },
  { name: "مدیریت دستگاه حضور و غیاب", code: "attendance.manage", description: "مدیریت دستگاه و اطلاعات تردد" },
  { name: "ثبت رزرو حضوری", code: "bookings.create", description: "ثبت رزرو برای مشتریان حضوری (بدون پرداخت آنلاین)" },
];

const defaults: Record<string, string[]> = {
  MANAGER: ["leave.approve.final", "leave.viewAll", "shifts.view", "shifts.manage", "shifts.swap.approve", "attendance.view", "attendance.manage", "bookings.create"],
  SUPERVISOR: ["leave.approve.supervisor", "leave.viewAll", "shifts.view", "shifts.manage", "shifts.swap.approve", "attendance.view", "bookings.create"],
};

export async function POST() {
  try {
    const auth = await authorize("roles.manage");
    if (!auth.ok) return auth.response;
    if (!isAdminRole(auth.user.role)) {
      return NextResponse.json({ error: "فقط مدیر سیستم می‌تواند دسترسی‌های پایه را همگام‌سازی کند." }, { status: 403 });
    }

    const permissionByCode = new Map<string, number>();
    for (const item of staffPermissions) {
      const permission = await prisma.permission.upsert({
        where: { code: item.code },
        update: { name: item.name, description: item.description, isActive: true },
        create: { ...item, isActive: true },
      });
      permissionByCode.set(permission.code, permission.id);
    }

    // Admin gets all newly-added permissions. Existing role assignments are never deleted.
    const admin = await prisma.role.findUnique({ where: { code: "ADMIN" } });
    if (admin) {
      for (const permissionId of permissionByCode.values()) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: admin.id, permissionId } },
          update: {},
          create: { roleId: admin.id, permissionId },
        });
      }
    }

    let assigned = 0;
    for (const [roleCode, codes] of Object.entries(defaults)) {
      const role = await prisma.role.findUnique({ where: { code: roleCode } });
      if (!role) continue;
      for (const code of codes) {
        const permissionId = permissionByCode.get(code);
        if (!permissionId) continue;
        const result = await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
        if (result) assigned++;
      }
    }

    return NextResponse.json({ success: true, synced: staffPermissions.length, message: "دسترسی‌های پرسنلی همگام‌سازی شدند." });
  } catch (error) {
    console.error("SYNC_ROLE_PERMISSIONS_ERROR:", error);
    return NextResponse.json({ error: "همگام‌سازی دسترسی‌ها ناموفق بود." }, { status: 500 });
  }
}
