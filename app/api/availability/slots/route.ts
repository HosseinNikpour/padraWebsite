import { NextResponse } from "next/server";

import {
  BOOKING_WINDOW_DAYS,
  addDays,
  isValidDate,
  nowInTehran,
} from "@/lib/availability";
import { getSlots, loadTarget, parseTargetType } from "@/lib/booking";

/**
 * نوبت‌های یک روز؛ به‌صورت داینامیک از قوانین هفتگی ساخته می‌شوند
 * و وضعیت هر نوبت (آزاد / تکمیل / گذشته) از دیتابیس رزروها خوانده می‌شود.
 *
 * GET /api/availability/slots?type=game&id=1&date=2026-10-16
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const type = parseTargetType(searchParams.get("type"));
    const id = Number(searchParams.get("id"));
    const date = searchParams.get("date");

    if (!type || !Number.isInteger(id) || !isValidDate(date)) {
      return NextResponse.json(
        { error: "پارامترهای درخواست نامعتبر است" },
        { status: 400 }
      );
    }

    const target = await loadTarget(type, id);

    if (!target || !target.isActive) {
      return NextResponse.json(
        { error: "مورد درخواستی پیدا نشد" },
        { status: 404 }
      );
    }

    const today = nowInTehran().date;

    if (date < today || date > addDays(today, BOOKING_WINDOW_DAYS)) {
      return NextResponse.json({ date, slots: [] });
    }

    const slots = await getSlots(target, date);

    return NextResponse.json(
      { date, slots },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("AVAILABILITY SLOTS ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت نوبت‌ها" },
      { status: 500 }
    );
  }
}
