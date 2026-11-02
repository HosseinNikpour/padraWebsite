import { NextResponse } from "next/server";

import { getBookingIdentity } from "@/lib/booking-identity";

/**
 * هویت واردشده برای صفحه‌ی رزرو: مشتری یا پرسنل. همیشه ۲۰۰ برمی‌گرداند.
 * (جدا از /api/customer/me است تا صفحه‌ی «رزروهای من» پرسنل را مشتری فرض نکند.)
 */
export async function GET() {
  const identity = await getBookingIdentity();

  return NextResponse.json(
    {
      customer: identity ? { id: identity.id, name: identity.name, phone: identity.phone } : null,
      staff: identity?.staff ?? false,
      canWalkIn: identity?.canWalkIn ?? false,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
