import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { BookingError, createBooking, loadTarget, parseTargetType } from "@/lib/booking";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * رزرو حضوری توسط پرسنل (دسترسی: bookings.create یا bookings.manage)
 *  GET  → فهرست بازی‌ها و ایونت‌های فعال برای فرم
 *  POST → { type, id, date, startTime, quantity, customerName?, customerPhone?, note }
 * پرداخت ندارد؛ رزرو بلافاصله CONFIRMED می‌شود و از ظرفیت نوبت کم می‌شود.
 */
export async function GET() {
  const auth = await authorize(["bookings.create", "bookings.manage"]);

  if (!auth.ok) return auth.response;

  const [games, events] = await Promise.all([
    prisma.game.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.event.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    games: games.map((g) => ({ id: g.id, name: g.name })),
    events: events.map((e) => ({ id: e.id, name: e.title })),
  });
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(["bookings.create", "bookings.manage"]);

    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const type = parseTargetType(body.type);
    const id = Number(body.id);
    const date = String(body.date ?? "");
    const startTime = String(body.startTime ?? "");
    const quantity = Number(body.quantity);
    const note = String(body.note ?? "").trim(); // اختیاری
    const customerName = String(body.customerName ?? "").trim().slice(0, 100) || "مشتری حضوری";
    const rawPhone = String(body.customerPhone ?? "").trim();
    const customerPhone = rawPhone ? parsePhone(rawPhone) : "";

    if (!type || !Number.isInteger(id)) {
      return NextResponse.json({ error: "بازی یا ایونت را انتخاب کنید" }, { status: 400 });
    }

    if (note.length > 500) {
      return NextResponse.json({ error: "توضیحات حداکثر ۵۰۰ کاراکتر باشد" }, { status: 400 });
    }

    if (customerPhone === null) {
      return NextResponse.json({ error: `${PHONE_ERROR} — یا خالی بگذارید` }, { status: 400 });
    }

    const target = await loadTarget(type, id);

    if (!target) {
      return NextResponse.json({ error: "مورد انتخاب‌شده پیدا نشد" }, { status: 404 });
    }

    const booking = await createBooking({
      target,
      date,
      startTime,
      quantity,
      customerName,
      customerPhone,
      staff: { id: auth.user.id, name: auth.user.name, note: note || null },
    });

    return NextResponse.json({ id: booking.id, trackingCode: booking.trackingCode }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("STAFF BOOKING ERROR:", error);

    return NextResponse.json({ error: "خطا در ثبت رزرو" }, { status: 500 });
  }
}
