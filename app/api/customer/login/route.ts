import { NextResponse } from "next/server";

import { createCustomerSession, verifyPasswordConstantTime } from "@/lib/customer-auth";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ipLimit = await rateLimit(`clogin:ip:${getClientIp(request)}`, 20, 15 * 60 * 1000);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید" },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const phone = normalizePhone(body?.phone);
    const password = String(body?.password ?? "").slice(0, 200);

    const userLimit = await rateLimit(`clogin:phone:${phone}`, 8, 15 * 60 * 1000);

    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید" },
        { status: 429, headers: { "Retry-After": String(userLimit.retryAfter) } }
      );
    }

    const customer = await prisma.user.findUnique({ where: { phone }, include: { role: true } });
    const ok = await verifyPasswordConstantTime(password, customer?.passwordHash);

    if (!customer || customer.role.code !== "CUSTOMER" || !customer.role.isActive || !customer.isActive || !ok) {
      return NextResponse.json({ error: "شماره موبایل یا رمز عبور اشتباه است" }, { status: 401 });
    }

    await clearRateLimit(`clogin:phone:${phone}`);
    await createCustomerSession(customer.id, customer.sessionVersion);

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    });
  } catch (error) {
    console.error("CUSTOMER LOGIN ERROR:", error);

    return NextResponse.json({ error: "خطا در ورود" }, { status: 500 });
  }
}
