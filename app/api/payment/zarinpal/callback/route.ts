import { NextResponse } from "next/server";

import { finalizePayment, getSiteUrl } from "@/lib/payment";

/**
 * بازگشت کاربر از زرین‌پال: GET ?Authority=...&Status=OK|NOK
 * نتیجه‌ی نهایی را فقط سرور با verify تعیین می‌کند؛ پارامتر Status به‌تنهایی قابل اعتماد نیست.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority") ?? "";
  const status = searchParams.get("Status") ?? "";

  const site = getSiteUrl(request);
  const result = await finalizePayment(authority, status);

  const redirect = new URL("/booking/result", site);

  redirect.searchParams.set("status", result.outcome);

  // پیام‌ها روی صفحه‌ی نتیجه ثابت هستند؛ متن دلخواه از طریق URL منعکس نمی‌شود
  if (result.outcome === "success") {
    redirect.searchParams.set("code", result.trackingCode);
  }

  return NextResponse.redirect(redirect, 303);
}
