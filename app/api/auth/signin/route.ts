import { NextResponse } from "next/server";

import { createSession, deleteSession, verifyPasswordConstantTime } from "@/lib/auth";
import { createCustomerSession, deleteCustomerSession } from "@/lib/customer-auth";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, getClientIp, rateLimit } from "@/lib/rate-limit";
import { resolveRedirect } from "@/lib/session";

const FAIL = "شماره موبایل / نام کاربری یا رمز عبور اشتباه است";

const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { error: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );

/**
 * ورود یکپارچه برای پرسنل و مشتری (تنها مسیر ورود).
 *
 * شناسه می‌تواند «نام کاربری پرسنل» یا «شماره موبایل مشتری» باشد. سرور تشخیص می‌دهد
 * حساب از کدام نوع است و کاربر را به صفحه‌ی مخصوص همان نوع می‌فرستد:
 *   پرسنل → /admin     مشتری → /profile (یا مسیر درخواستیِ مجاز)
 */
export async function POST(request: Request) {
  try {
    const ipLimit = await rateLimit(`signin:ip:${getClientIp(request)}`, 25, 15 * 60 * 1000);

    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfter);

    const body = await request.json().catch(() => null);
    const identifier = String(body?.identifier ?? "").trim().slice(0, 100);
    const password = String(body?.password ?? "").slice(0, 200);
    const next = typeof body?.next === "string" ? body.next : null;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "شماره موبایل یا نام کاربری و رمز عبور را وارد کنید" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(identifier);
    const key = `signin:id:${(isValidPhone(phone) ? phone : identifier).toLowerCase()}`;
    const idLimit = await rateLimit(key, 8, 15 * 60 * 1000);

    if (!idLimit.allowed) return tooMany(idLimit.retryAfter);

    const account = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, ...(isValidPhone(phone) ? [{ phone }] : [])] },
      include: { role: true },
    });
    const accountOk = await verifyPasswordConstantTime(password, account?.passwordHash);

    if (account && accountOk && account.isActive && account.role.isActive) {
      await clearRateLimit(key);

      if (account.role.code === "CUSTOMER") {
        await createCustomerSession(account.id, account.sessionVersion);
        await deleteSession();
        return NextResponse.json({ type: "customer", name: account.name, redirect: resolveRedirect("customer", next) });
      }

      await createSession(account.id, account.roleId, account.sessionVersion);
      await deleteCustomerSession();
      return NextResponse.json({ type: "staff", name: account.name, redirect: resolveRedirect("staff", next) });
    }

    return NextResponse.json({ error: FAIL }, { status: 401 });
  } catch (error) {
    console.error("SIGNIN ERROR:", error);

    return NextResponse.json({ error: "خطایی در ورود رخ داد" }, { status: 500 });
  }
}
