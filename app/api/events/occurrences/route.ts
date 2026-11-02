import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";

/**
 * GET
 * دریافت سانس‌های یک روز
 *
 * مثال:
 * /api/events/occurrences?date=2026-10-03
 */
export async function GET(request: Request) {
  try {
    const auth = await authorize("events.view");
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "تاریخ الزامی است" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59.999`);

    if (Number.isNaN(startOfDay.getTime())) {
      return NextResponse.json(
        { error: "تاریخ معتبر نیست" },
        { status: 400 }
      );
    }

    const occurrences = await prisma.eventOccurrence.findMany({
      where: {
        eventDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        event: true,
      },
      orderBy: [
        {
          startTime: "asc",
        },
        {
          sortOrder: "asc",
        },
      ],
    });

    return NextResponse.json(occurrences);
  } catch (error) {
    console.error("EVENT OCCURRENCES GET ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت سانس‌های ایونت" },
      { status: 500 }
    );
  }
}


/**
 * POST
 * ایجاد یک سانس جدید برای یک روز
 */
export async function POST(request: Request) {
  try {
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const eventId = Number(body.eventId);
    const date = String(body.date ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();

    const price =
      body.price !== undefined &&
      body.price !== null &&
      body.price !== ""
        ? Number(body.price)
        : 0;

    const capacity =
      body.capacity !== undefined &&
      body.capacity !== null &&
      body.capacity !== ""
        ? Number(body.capacity)
        : null;

    const sortOrder =
      body.sortOrder !== undefined &&
      body.sortOrder !== null &&
      body.sortOrder !== ""
        ? Number(body.sortOrder)
        : 0;

    const isActive =
      body.isActive === undefined
        ? true
        : Boolean(body.isActive);

    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "تاریخ الزامی است" },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "ساعت شروع و پایان الزامی است" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "قیمت معتبر نیست" },
        { status: 400 }
      );
    }

    if (
      capacity !== null &&
      (!Number.isFinite(capacity) || capacity <= 0)
    ) {
      return NextResponse.json(
        { error: "ظرفیت معتبر نیست" },
        { status: 400 }
      );
    }

    const eventDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: "تاریخ معتبر نیست" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "ایونت پیدا نشد" },
        { status: 404 }
      );
    }

    const occurrence = await prisma.eventOccurrence.create({
      data: {
        eventId,
        eventDate,
        startTime,
        endTime,
        price,
        capacity,
        sortOrder,
        isActive,
      },
      include: {
        event: true,
      },
    });

    return NextResponse.json(occurrence, {
      status: 201,
    });
  } catch (error) {
    console.error("EVENT OCCURRENCES POST ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ایجاد سانس ایونت" },
      { status: 500 }
    );
  }
}