import { NextResponse } from "next/server";

import { deleteSession } from "@/lib/auth";
import { deleteCustomerSession } from "@/lib/customer-auth";

/** خروج برای هر دو نوع کاربر */
export async function POST() {
  await deleteSession();
  await deleteCustomerSession();

  return NextResponse.json({ success: true });
}
