import { NextResponse } from "next/server";

import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { fail, requireStaff } from "@/lib/staff";

/** تغییر رمز عبور پرسنل (نیازمند رمز فعلی) */
export async function POST(request: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    const { user } = auth;
    const limit = await rateLimit(`spass:${user.id}`, 6, 15 * 60 * 1000);

    if (!limit.allowed) return fail("تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید", 429);

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    const passwordError = validatePassword(newPassword, { username: user.username });

    if (passwordError) return fail(passwordError);
    if (newPassword === currentPassword) return fail("رمز جدید باید با رمز فعلی متفاوت باشد");

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });

    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) return fail("رمز فعلی اشتباه است");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true, roleId: true },
    });

    // نشست دستگاه‌های دیگر باطل می‌شود؛ نشست همین دستگاه با نسخه‌ی جدید دوباره ساخته می‌شود
    await createSession(user.id, updated.roleId, updated.sessionVersion);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("STAFF PASSWORD ERROR:", error);

    return fail("خطا در تغییر رمز", 500);
  }
}
