import { NextResponse } from "next/server";

import { getCurrentCustomer } from "@/lib/customer-auth";
import { nowInTehran } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

/** اطلاعات پروفایل و آمار رزروهای مشتری واردشده */
export async function GET() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
  }

  const today = new Date(`${nowInTehran().date}T00:00:00Z`);

  const [row, total, confirmed, upcoming, paid] = await Promise.all([
    prisma.user.findUnique({
      where: { id: customer.id },
      select: { id: true, name: true, phone: true, createdAt: true },
    }),
    prisma.booking.count({ where: { userId: customer.id } }),
    prisma.booking.count({ where: { userId: customer.id, status: "CONFIRMED" } }),
    prisma.booking.count({
      where: { userId: customer.id, status: "CONFIRMED", date: { gte: today } },
    }),
    prisma.booking.aggregate({
      where: { userId: customer.id, status: "CONFIRMED" },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json(
    {
      customer: row,
      stats: {
        total,
        confirmed,
        upcoming,
        totalPaid: paid._sum.amount ?? 0,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** ویرایش نام (شماره‌ی موبایل بدون تأیید پیامکی قابل تغییر نیست) */
export async function PATCH(request: Request) {
  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { error: "نام و نام خانوادگی باید بین ۲ تا ۶۰ کاراکتر باشد" },
        { status: 400 }
      );
    }

    await prisma.user.update({ where: { id: customer.id }, data: { name } });

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("CUSTOMER PROFILE UPDATE ERROR:", error);

    return NextResponse.json({ error: "خطا در ذخیره‌ی اطلاعات" }, { status: 500 });
  }
}
