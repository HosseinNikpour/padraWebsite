import { NextResponse } from "next/server";

import { BOOKING_WINDOW_DAYS } from "@/lib/availability";
import {
  loadRules,
  loadTarget,
  openWeekdays,
  parseTargetType,
} from "@/lib/booking";

/**
 * اطلاعات عمومی یک بازی/ایونت برای صفحه‌ی رزرو.
 * GET /api/availability/info?type=game&id=1
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const type = parseTargetType(searchParams.get("type"));
    const id = Number(searchParams.get("id"));

    if (!type || !Number.isInteger(id)) {
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

    const rules = await loadRules(target);

    return NextResponse.json({
      ...target,
      openWeekdays: openWeekdays(
        rules,
        target.durationMinutes,
        target.gapMinutes
      ),
      windowDays: BOOKING_WINDOW_DAYS,
    });
  } catch (error) {
    console.error("AVAILABILITY INFO ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}
