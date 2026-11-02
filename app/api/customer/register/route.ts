import { NextResponse } from "next/server";

import { createCustomerSession, hashPassword } from "@/lib/customer-auth";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";
import { resolveRedirect } from "@/lib/redirect";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/** ثبت‌نام مشتری با نام، موبایل و رمز عبور */
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`register:ip:${getClientIp(request)}`, 10, 60 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. بعداً تلاش کنید" },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    const phone = parsePhone(body.phone);
    const password = String(body.password ?? "");

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "نام و نام خانوادگی را وارد کنید" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }

    const passwordError = validatePassword(password, { phone });

    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { phone }, select: { id: true } });

    if (exists) {
      return NextResponse.json(
        { error: "با این شماره قبلاً ثبت‌نام شده است. وارد شوید" },
        { status: 409 }
      );
    }

    const role = await prisma.role.upsert({
      where: { code: "CUSTOMER" }, update: { isActive: true },
      create: { name: "مشتری", code: "CUSTOMER", description: "حساب مشتریان سایت" },
    });
    const customer = await prisma.user.create({
      data: { name, phone, username: `customer_${phone}`, passwordHash: await hashPassword(password), roleId: role.id },
    });

    await createCustomerSession(customer.id, customer.sessionVersion);

    return NextResponse.json(
      {
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
        type: "customer",
        redirect: resolveRedirect("customer", typeof body.next === "string" ? body.next : null),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CUSTOMER REGISTER ERROR:", error);

    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 });
  }
}
