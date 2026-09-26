import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "شناسه ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const image = body.image ? String(body.image) : null;

    const eventDate = new Date(body.eventDate);

    const startTime = body.startTime
      ? String(body.startTime).trim()
      : null;

    const endTime = body.endTime
      ? String(body.endTime).trim()
      : null;

    const sortOrder = Number(body.sortOrder ?? 0);
    const isActive = Boolean(body.isActive);

    if (!title) {
      return NextResponse.json(
        { error: "عنوان ایونت الزامی است" },
        { status: 400 }
      );
    }

    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: "تاریخ ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json(
        { error: "ترتیب نمایش معتبر نیست" },
        { status: 400 }
      );
    }

    const event = await prisma.event.update({
      where: {
        id: eventId,
      },
      data: {
        title,
        description: description || null,
        image,
        eventDate,
        startTime,
        endTime,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("EVENTS PUT ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ویرایش ایونت" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "شناسه ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    await prisma.event.delete({
      where: {
        id: eventId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("EVENTS DELETE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در حذف ایونت" },
      { status: 500 }
    );
  }
}