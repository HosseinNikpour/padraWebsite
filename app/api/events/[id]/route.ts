import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

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

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "ایونت پیدا نشد" },
        { status: 404 }
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
        capacity,
        genre,
        duration,
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
    const auth = await authorize("events.manage");
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const eventId = Number(id);

    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "شناسه ایونت معتبر نیست" },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "ایونت پیدا نشد" },
        { status: 404 }
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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "این ایونت رزرو ثبت‌شده دارد و حذف نمی‌شود. به‌جای حذف، آن را غیرفعال کنید.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "خطا در حذف ایونت" },
      { status: 500 }
    );
  }
}