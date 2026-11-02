import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { BookingError, changeBookingStatus } from "@/lib/booking";

type Params = { params: Promise<{ id: string }> };

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;

/** تغییر وضعیت رزرو توسط ادمین: PENDING | CONFIRMED | CANCELLED */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await authorize("bookings.manage");
    if (!auth.ok) return auth.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (
      !Number.isInteger(id) ||
      !STATUSES.includes(status as (typeof STATUSES)[number])
    ) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 }
      );
    }

    const booking = await changeBookingStatus(
      id,
      status as (typeof STATUSES)[number],
      { id: auth.user.id }
    );

    return NextResponse.json({ id: booking.id, status: booking.status });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("UPDATE BOOKING ERROR:", error);

    return NextResponse.json(
      { error: "خطا در تغییر وضعیت رزرو" },
      { status: 500 }
    );
  }
}
