import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDeviceCode } from "@/lib/attendance";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  authorize,
  canManageRole,
  hashPassword,
  isAdminRole,
} from "@/lib/auth";
import { validatePassword } from "@/lib/password";

const roleInclude = {
  permissions: { include: { permission: true } },
} as const;


/** فیلدهای پرسنلی اختیاری: کد دستگاه حضور و غیاب و سوپروایزر. خطا = پیام فارسی */
async function parseStaffFields(body: Record<string, unknown>, selfId?: number) {
  const rawCode = String(body.deviceCode ?? "").trim();
  const deviceCode = rawCode ? normalizeDeviceCode(rawCode) : null;

  if (deviceCode && !/^[A-Za-z0-9_-]{1,20}$/.test(deviceCode)) {
    return { error: "کد دستگاه فقط شامل حروف انگلیسی، عدد، - و _ (حداکثر ۲۰ کاراکتر) باشد" } as const;
  }

  const supervisorId = body.supervisorId ? Number(body.supervisorId) : null;

  if (supervisorId !== null) {
    if (!Number.isInteger(supervisorId) || supervisorId === selfId) {
      return { error: "سوپروایزر انتخاب‌شده معتبر نیست" } as const;
    }

    const supervisor = await prisma.user.findFirst({ where: { id: supervisorId, isActive: true }, select: { id: true } });

    if (!supervisor) return { error: "سوپروایزر انتخاب‌شده پیدا نشد" } as const;
  }

  if (deviceCode) {
    const taken = await prisma.user.findFirst({
      where: { deviceCode, ...(selfId ? { id: { not: selfId } } : {}) },
      select: { id: true },
    });

    if (taken) return { error: "این کد دستگاه به پرسنل دیگری اختصاص داده شده است" } as const;
  }

  return { deviceCode, supervisorId } as const;
}

/** آیا بعد از این تغییر حداقل یک ADMIN فعال باقی می‌ماند؟ */
async function otherActiveAdminExists(excludeUserId: number) {
  const count = await prisma.user.count({
    where: {
      id: { not: excludeUserId },
      isActive: true,
      role: { code: "ADMIN", isActive: true },
    },
  });

  return count > 0;
}

export async function GET() {
  try {
    const auth = await authorize("users.view");
    if (!auth.ok) return auth.response;

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, username: true, phone: true, isActive: true, roleId: true, deviceCode: true, supervisorId: true,
        role: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: "خطا در دریافت کاربران" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize("users.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const roleId = Number(body.roleId);
    const rawPhone = String(body.phone ?? "").trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (!name || !username || !password || !Number.isInteger(roleId) || roleId < 1) {
      return NextResponse.json({ error: "تمام اطلاعات کاربر را وارد کنید" }, { status: 400 });
    }
    const passwordError = validatePassword(password, { username, phone: phone ?? undefined });
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const [existingUser, role] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      prisma.role.findUnique({ where: { id: roleId }, include: roleInclude }),
    ]);
    if (existingUser) return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    if (!role || !role.isActive) return NextResponse.json({ error: "نقش انتخاب‌شده معتبر نیست" }, { status: 400 });
    if (role.code === "CUSTOMER" && (!phone || !isValidPhone(phone))) return NextResponse.json({ error: "برای حساب مشتری شماره موبایل معتبر الزامی است" }, { status: 400 });
    if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    if (!canManageRole(auth.user, role)) return NextResponse.json({ error: "اجازه‌ی اختصاص این نقش را ندارید" }, { status: 403 });

    const staff = await parseStaffFields(body);
    if ("error" in staff) return NextResponse.json({ error: staff.error }, { status: 400 });

    const user = await prisma.user.create({
      data: { name, username, phone, passwordHash: await hashPassword(password), roleId, isActive: true, deviceCode: staff.deviceCode, supervisorId: staff.supervisorId },
      select: { id: true, name: true, username: true, phone: true, isActive: true, roleId: true, deviceCode: true, supervisorId: true, role: { select: { id: true, name: true, code: true } }, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    }
    return NextResponse.json({ error: "خطا در ایجاد کاربر" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize("users.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const id = Number(body.id);
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const roleId = Number(body.roleId);
    const rawPhone = String(body.phone ?? "").trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const isActive = body.isActive === true;
    const password = body.password === undefined ? "" : String(body.password);

    if (!Number.isInteger(id) || id < 1 || !name || !username || !Number.isInteger(roleId) || roleId < 1) {
      return NextResponse.json({ error: "اطلاعات واردشده معتبر نیست" }, { status: 400 });
    }
    const passwordError = password ? validatePassword(password, { username, phone: phone ?? undefined }) : null;
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const [existingUser, role, duplicateUsername] = await Promise.all([
      prisma.user.findUnique({ where: { id }, include: { role: { include: roleInclude } } }),
      prisma.role.findUnique({ where: { id: roleId }, include: roleInclude }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (!existingUser) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
    if (duplicateUsername && duplicateUsername.id !== id) return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    if (!role || !role.isActive) return NextResponse.json({ error: "نقش انتخاب‌شده معتبر نیست" }, { status: 400 });
    if (role.code === "CUSTOMER" && (!phone || !isValidPhone(phone))) return NextResponse.json({ error: "برای حساب مشتری شماره موبایل معتبر الزامی است" }, { status: 400 });
    if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    const duplicatePhone = phone ? await prisma.user.findUnique({ where: { phone } }) : null;
    if (duplicatePhone && duplicatePhone.id !== id) return NextResponse.json({ error: "این شماره موبایل قبلاً ثبت شده است" }, { status: 409 });

    // فقط کاربرانی را می‌توان ویرایش کرد که نقش فعلی و نقش جدیدشان در سطح اختیار شما باشد
    if (!canManageRole(auth.user, existingUser.role) || !canManageRole(auth.user, role)) {
      return NextResponse.json({ error: "اجازه‌ی ویرایش این کاربر یا اختصاص این نقش را ندارید" }, { status: 403 });
    }

    if (auth.user.id === id && (!isActive || roleId !== existingUser.roleId)) {
      return NextResponse.json({ error: "امکان غیرفعال کردن یا تغییر نقش حساب خودتان وجود ندارد" }, { status: 400 });
    }

    const losesAdmin = isAdminRole(existingUser.role) && (!isActive || !isAdminRole(role));
    if (losesAdmin && !(await otherActiveAdminExists(id))) {
      return NextResponse.json({ error: "حداقل یک مدیر سیستم فعال باید باقی بماند" }, { status: 400 });
    }

    const staff = await parseStaffFields(body, id);
    if ("error" in staff) return NextResponse.json({ error: staff.error }, { status: 400 });

    const data: { name: string; username: string; phone: string | null; roleId: number; isActive: boolean; passwordHash?: string; sessionVersion?: { increment: number }; deviceCode: string | null; supervisorId: number | null } = { name, username, phone, roleId, isActive, deviceCode: staff.deviceCode, supervisorId: staff.supervisorId };
    if (password) data.passwordHash = await hashPassword(password);
    // تغییر رمز توسط مدیر، نشست‌های فعلی آن کاربر را باطل می‌کند
    if (password) data.sessionVersion = { increment: 1 };
    const user = await prisma.user.update({
      where: { id }, data,
      select: { id: true, name: true, username: true, phone: true, isActive: true, roleId: true, deviceCode: true, supervisorId: true, role: { select: { id: true, name: true, code: true } }, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return NextResponse.json({ error: "خطا در ویرایش کاربر" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize("users.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "شناسه کاربر معتبر نیست" }, { status: 400 });
    if (auth.user.id === id) return NextResponse.json({ error: "امکان حذف حساب کاربری خودتان وجود ندارد" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id }, include: { role: { include: roleInclude } } });
    if (!user) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
    if (!canManageRole(auth.user, user.role)) return NextResponse.json({ error: "اجازه‌ی حذف این کاربر را ندارید" }, { status: 403 });
    if (isAdminRole(user.role) && !(await otherActiveAdminExists(id))) {
      return NextResponse.json({ error: "حداقل یک مدیر سیستم فعال باید باقی بماند" }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
  }
}
