import { NextResponse } from "next/server";

import { getCurrentCustomer } from "@/lib/customer-auth";
import { recordStatus } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * لغو رزروِ پرداخت‌نشده توسط خود مشتری (ظرفیت آزاد می‌شود).
 * رزروِ پرداخت‌شده از اینجا لغو نمی‌شود، چون بازگشت وجه خودکار نیست؛ باید با پشتیبانی هماهنگ شود.
 * اگر کاربر بعد از لغو در درگاه پرداخت کند، callback بدون verify رد می‌شود و زرین‌پال مبلغ را برمی‌گرداند.
 */
export async function POST(_request: Request, { params }: Params) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const result = await prisma.booking.updateMany({
    where: { id, userId: customer.id, status: "PENDING" },
    data: { status: "CANCELLED", expiresAt: null },
  });

  if (result.count === 1) {
    await recordStatus(prisma, id, "PENDING", "CANCELLED", "CUSTOMER", { actorId: customer.id });
    // تلاش پرداخت باز این رزرو دیگر معتبر نیست
    await prisma.payment.updateMany({ where: { bookingId: id, status: "PENDING" }, data: { status: "ABANDONED" } });
  }

  if (result.count === 0) {
    return NextResponse.json(
      { error: "این رزرو قابل لغو نیست (پرداخت شده، لغو شده یا متعلق به شما نیست)" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
