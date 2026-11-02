import { NextResponse } from "next/server";

import { toCustomerBooking } from "@/lib/booking-view";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

/** رزروهای مشتری واردشده */
export async function GET() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: customer.id },
    include: {
      game: { select: { name: true } },
      event: { select: { title: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }, { id: "desc" }],
    take: 200,
  });

  return NextResponse.json(bookings.map(toCustomerBooking), {
    headers: { "Cache-Control": "no-store" },
  });
}
