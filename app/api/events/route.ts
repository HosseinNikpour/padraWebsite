import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await authorize("events.view");
    if (!auth.ok) return auth.response;

    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            occurrences: true,
          },
        },
        occurrences: {
          where: {
            isActive: true,
          },
          orderBy: [
            { eventDate: "asc" },
            { startTime: "asc" },
            { sortOrder: "asc" },
          ],
        },
      },
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
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const image = body.image ? String(body.image) : null;

    const capacity =
      body.capacity !== null &&
      body.capacity !== undefined &&
      body.capacity !== ""
        ? Number(body.capacity)
        : null;

    const genre = body.genre
      ? String(body.genre).trim()
      : null;

    const duration =
      body.duration !== null &&
      body.duration !== undefined &&
      body.duration !== ""
        ? Number(body.duration)
        : null;

    const isActive =
      body.isActive === undefined
        ? true
        : Boolean(body.isActive);

    if (!title) {
      return NextResponse.json(
        { error: "عنوان ایونت الزامی است" },
        { status: 400 }
      );
    }

    if (
      capacity !== null &&
      (!Number.isFinite(capacity) || capacity <= 0)
    ) {
      return NextResponse.json(
        { error: "ظرفیت ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    if (
      duration !== null &&
      (!Number.isFinite(duration) || duration <= 0)
    ) {
      return NextResponse.json(
        { error: "مدت زمان ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        image,
        capacity,
        genre,
        duration,
        isActive,
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