import { NextResponse } from "next/server";

import { deleteCustomerSession } from "@/lib/customer-auth";

export async function POST() {
  await deleteCustomerSession();

  return NextResponse.json({ success: true });
}
