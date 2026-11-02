import { NextResponse } from "next/server";

import { getCurrentCustomer } from "@/lib/customer-auth";

/** مشتری واردشده (یا null). همیشه ۲۰۰ برمی‌گرداند تا کنسول مرورگر خطا نشان ندهد. */
export async function GET() {
  const customer = await getCurrentCustomer();

  return NextResponse.json(
    {
      customer: customer
        ? { id: customer.id, name: customer.name, phone: customer.phone }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
