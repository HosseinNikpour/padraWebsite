import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};


/**
 * PUT
 * ویرایش یک سانس
 */
export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const occurrenceId = Number(id);

    if (!Number.isInteger(occurrenceId)) {
      return NextResponse.json(
        { error: "شناسه سانس معتبر نیست" },
        { status: 400 }
      );
    }

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

    const existing = await prisma.eventOccurrence.findUnique({
      where: {
        id: occurrenceId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "سانس پیدا نشد" },
        { status: 404 }
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

    const occurrence = await prisma.eventOccurrence.update({
      where: {
        id: occurrenceId,
      },
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

    return NextResponse.json(occurrence);
  } catch (error) {
    console.error("EVENT OCCURRENCE PUT ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ویرایش سانس ایونت" },
      { status: 500 }
    );
  }
}


/**
 * DELETE
 * حذف یک سانس
 */
export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const occurrenceId = Number(id);

    if (!Number.isInteger(occurrenceId)) {
      return NextResponse.json(
        { error: "شناسه سانس معتبر نیست" },
        { status: 400 }
      );
    }

    const existing = await prisma.eventOccurrence.findUnique({
      where: {
        id: occurrenceId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "سانس پیدا نشد" },
        { status: 404 }
      );
    }

    await prisma.eventOccurrence.delete({
      where: {
        id: occurrenceId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("EVENT OCCURRENCE DELETE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در حذف سانس ایونت" },
      { status: 500 }
    );
  }
}