import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: [
        { eventDate: "asc" },
        { sortOrder: "asc" },
      ],
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("EVENTS GET ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت ایونت‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        image,
        eventDate,
        startTime,
        endTime,
        sortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("EVENTS POST ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ایجاد ایونت" },
      { status: 500 }
    );
  }
}