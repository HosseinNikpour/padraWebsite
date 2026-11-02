import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const roles = [
  {
    name: "مدیر سیستم",
    code: "ADMIN",
    description: "دسترسی کامل به سامانه",
  },
  {
    name: "مدیر مجموعه",
    code: "MANAGER",
    description: "مدیریت مجموعه و عملیات",
  },
  {
    name: "سرپرست",
    code: "SUPERVISOR",
    description: "نظارت بر فعالیت‌های مجموعه",
  },
  {
    name: "اپراتور بازی",
    code: "GAME_OPERATOR",
    description: "مدیریت و اجرای بازی‌ها",
  },
  {
    name: "پذیرش",
    code: "RECEPTIONIST",
    description: "مدیریت پذیرش و رزروها",
  },
  {
    name: "کافه",
    code: "CAFE",
    description: "مدیریت امور کافه",
  },
  {
    name: "تولید محتوا",
    code: "CONTENT",
    description: "مدیریت و تولید محتوای مجموعه",
  },
];

const permissions = [
  {
    name: "مشاهده بازی‌ها",
    code: "games.view",
    description: "مشاهده بازی‌ها",
  },
  {
    name: "مدیریت بازی‌ها",
    code: "games.manage",
    description: "ایجاد، ویرایش و حذف بازی‌ها",
  },

  {
    name: "مشاهده رویدادها",
    code: "events.view",
    description: "مشاهده رویدادها",
  },
  {
    name: "مدیریت رویدادها",
    code: "events.manage",
    description: "ایجاد، ویرایش و حذف رویدادها",
  },

  {
    name: "مشاهده زمان‌بندی‌ها",
    code: "schedules.view",
    description: "مشاهده زمان‌بندی بازی‌ها",
  },
  {
    name: "مدیریت زمان‌بندی‌ها",
    code: "schedules.manage",
    description: "ایجاد، ویرایش و حذف زمان‌بندی‌ها",
  },

  {
    name: "مشاهده منو",
    code: "menu.view",
    description: "مشاهده منوی کافه",
  },
  {
    name: "مدیریت منو",
    code: "menu.manage",
    description: "مدیریت دسته‌بندی و آیتم‌های منو",
  },

  {
    name: "مشاهده رزروها",
    code: "bookings.view",
    description: "مشاهده رزروها",
  },
  {
    name: "مدیریت رزروها",
    code: "bookings.manage",
    description: "مدیریت رزروها",
  },
  {
    name: "ثبت رزرو حضوری",
    code: "bookings.create",
    description: "ثبت رزرو برای مشتریان حضوری (بدون پرداخت آنلاین)",
  },

  {
    name: "مشاهده کاربران",
    code: "users.view",
    description: "مشاهده کاربران",
  },
  {
    name: "مدیریت کاربران",
    code: "users.manage",
    description: "ایجاد، ویرایش و مدیریت کاربران",
  },

  {
    name: "مشاهده نقش‌ها",
    code: "roles.view",
    description: "مشاهده نقش‌ها",
  },
  {
    name: "مدیریت نقش‌ها",
    code: "roles.manage",
    description: "مدیریت نقش‌ها و دسترسی‌ها",
  },

  // --- پرسنل: مرخصی، شیفت، حضور و غیاب ---
  {
    name: "تأیید مرخصی (سوپروایزر)",
    code: "leave.approve.supervisor",
    description: "تأیید مرحله‌ی اول درخواست مرخصی پرسنل",
  },
  {
    name: "تأیید نهایی مرخصی (مدیر)",
    code: "leave.approve.final",
    description: "تأیید نهایی درخواست مرخصی و لغو مرخصی‌های تأییدشده",
  },
  {
    name: "مشاهده همه‌ی مرخصی‌ها",
    code: "leave.viewAll",
    description: "مشاهده مرخصی‌های همه‌ی پرسنل",
  },
  {
    name: "مشاهده شیفت همه‌ی پرسنل",
    code: "shifts.view",
    description: "مشاهده تقویم شیفت و شیفت روزانه‌ی همه‌ی پرسنل",
  },
  {
    name: "مدیریت شیفت‌ها",
    code: "shifts.manage",
    description: "ثبت و ویرایش شیفت پرسنل",
  },
  {
    name: "تأیید جابه‌جایی شیفت",
    code: "shifts.swap.approve",
    description: "تأیید یا رد درخواست جابه‌جایی شیفت",
  },
  {
    name: "مشاهده حضور و غیاب همه",
    code: "attendance.view",
    description: "مشاهده کارکرد و حضور و غیاب همه‌ی پرسنل",
  },
  {
    name: "مدیریت دستگاه حضور و غیاب",
    code: "attendance.manage",
    description: "ثبت دستگاه، ورود فایل تردد و تطبیق کد پرسنل",
  },
];

/**
 * دسترسی‌های پیش‌فرض نقش‌ها برای بخش پرسنل (فقط اضافه می‌شود؛ چیزی حذف نمی‌شود).
 * بعداً از صفحه‌ی «نقش‌ها و دسترسی‌ها» قابل تغییر است.
 */
const defaultRolePermissions: Record<string, string[]> = {
  MANAGER: [
    "leave.approve.final", "leave.viewAll", "shifts.view", "shifts.manage",
    "shifts.swap.approve", "attendance.view", "attendance.manage",
  ],
  SUPERVISOR: [
    "leave.approve.supervisor", "leave.viewAll", "shifts.view", "shifts.manage",
    "shifts.swap.approve", "attendance.view",
  ],
};

export async function POST(request: Request) {
  try {
    const setupKey = request.headers.get("x-setup-key");

    if (
      !process.env.AUTH_SETUP_KEY ||
      !setupKey ||
      !safeEqual(setupKey, process.env.AUTH_SETUP_KEY)
    ) {
      return NextResponse.json(
        {
          error: "دسترسی غیرمجاز",
        },
        {
          status: 403,
        }
      );
    }

    // راه‌اندازی اولیه فقط یک‌بار: بعد از ساخته شدن اولین مدیر سیستم این مسیر بسته می‌شود.
    // (همگام‌سازی دسترسی‌های جدید از «نقش‌ها ← همگام‌سازی» در پنل انجام می‌شود.)
    const adminCount = await prisma.user.count({
      where: { role: { code: "ADMIN" } },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "راه‌اندازی اولیه قبلاً انجام شده است. AUTH_SETUP_KEY را از تنظیمات محیطی حذف کنید." },
        { status: 409 }
      );
    }

    /*
     * 1. Create / update roles
     */

    const roleMap = new Map<string, number>();

    for (const roleData of roles) {
      const role = await prisma.role.upsert({
        where: {
          code: roleData.code,
        },
        update: {
          name: roleData.name,
          description: roleData.description,
        },
        create: roleData,
      });

      roleMap.set(role.code, role.id);
    }

    /*
     * 2. Create / update permissions
     */

    const permissionMap = new Map<string, number>();

    for (const permissionData of permissions) {
      const permission = await prisma.permission.upsert({
        where: {
          code: permissionData.code,
        },
        update: {
          name: permissionData.name,
          description: permissionData.description,
        },
        create: permissionData,
      });

      permissionMap.set(
        permission.code,
        permission.id
      );
    }

    /*
     * 3. Give ADMIN all permissions
     */

    const adminRoleId = roleMap.get("ADMIN");

    if (!adminRoleId) {
      throw new Error("ADMIN role was not created");
    }

    for (const permission of permissions) {
      const permissionId = permissionMap.get(
        permission.code
      );

      if (!permissionId) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRoleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: adminRoleId,
          permissionId,
        },
      });
    }

    /*
     * 3b. Default HR permissions for MANAGER / SUPERVISOR (additive, idempotent)
     */

    for (const [roleCode, codes] of Object.entries(defaultRolePermissions)) {
      const roleId = roleMap.get(roleCode);

      if (!roleId) continue;

      for (const code of codes) {
        const permissionId = permissionMap.get(code);

        if (!permissionId) continue;

        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId },
        });
      }
    }

    /*
     * 4. Create admin user only if it doesn't exist
     */

    const body = await request.json();

    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!name || !username || !password) {
      return NextResponse.json(
        {
          error:
            "اطلاعات کاربر جدید را وارد کنید",
        },
        {
          status: 400,
        }
      );
    }

    const passwordError = validatePassword(password, { username });

    if (passwordError) {
      return NextResponse.json(
        {
          error: passwordError,
        },
        {
          status: 400,
        }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          username,
        },
      });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message:
          "Roleها و Permissionها تنظیم شدند. کاربر قبلاً وجود داشت.",
        user: {
          id: existingUser.id,
          name: existingUser.name,
          username: existingUser.username,
          roleId: existingUser.roleId,
        },
      });
    }

    const passwordHash =
      await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        roleId: adminRoleId,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Roleها، Permissionها و کاربر Admin با موفقیت ایجاد شدند.",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: "ADMIN",
      },
    });
  } catch (error) {
    console.error("SETUP ERROR:", error);

    return NextResponse.json(
      {
        error: "خطا در اجرای Setup",
      },
      {
        status: 500,
      }
    );
  }
}