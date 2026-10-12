import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scheduleId = Number(id);

    if (!Number.isInteger(scheduleId)) {
      return NextResponse.json(
        { error: "شناسه سانس نامعتبر است" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      gameId,
      date,
      startTime,
      endTime,
      capacity,
      isActive,
    } = body;

    if (
      !gameId ||
      !date ||
      !startTime ||
      !endTime ||
      capacity === undefined
    ) {
      return NextResponse.json(
        { error: "اطلاعات سانس کامل نیست" },
        { status: 400 }
      );
    }

    const schedule = await prisma.gameSchedule.update({
      where: {
        id: scheduleId,
      },
      data: {
        gameId: Number(gameId),
        date: new Date(`${date}T00:00:00`),
        startTime: String(startTime),
        endTime: String(endTime),
        capacity: Number(capacity),
        isActive: Boolean(isActive),
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("UPDATE SCHEDULE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ویرایش سانس" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scheduleId = Number(id);

    if (!Number.isInteger(scheduleId)) {
      return NextResponse.json(
        { error: "شناسه سانس نامعتبر است" },
        { status: 400 }
      );
    }

    await prisma.gameSchedule.delete({
      where: {
        id: scheduleId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE SCHEDULE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در حذف سانس" },
      { status: 500 }
    );
  }
}