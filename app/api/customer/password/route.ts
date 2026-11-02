import { NextResponse } from "next/server";

import {
  createCustomerSession,
  getCurrentCustomer,
  hashPassword,
  verifyPassword,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

/** تغییر رمز عبور (نیازمند رمز فعلی) */
export async function POST(request: Request) {
  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    }

    const limit = await rateLimit(`cpass:${customer.id}`, 6, 15 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    const passwordError = validatePassword(newPassword, { phone: customer.phone });

    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const row = await prisma.user.findUnique({ where: { id: customer.id } });

    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      return NextResponse.json({ error: "رمز فعلی اشتباه است" }, { status: 400 });
    }

    // افزایش sessionVersion: نشست دستگاه‌های دیگر باطل می‌شود؛ نشست فعلی با نسخه‌ی جدید دوباره ساخته می‌شود
    const updated = await prisma.user.update({
      where: { id: customer.id },
      data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });

    await createCustomerSession(customer.id, updated.sessionVersion);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CUSTOMER PASSWORD ERROR:", error);

    return NextResponse.json({ error: "خطا در تغییر رمز" }, { status: 500 });
  }
}
