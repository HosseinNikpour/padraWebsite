import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const schedules = await prisma.gameSchedule.findMany({
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("GET SCHEDULES ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت سانس‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
        { error: "لطفاً تمام اطلاعات سانس را وارد کنید" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: {
        id: Number(gameId),
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "بازی پیدا نشد" },
        { status: 404 }
      );
    }

    const schedule = await prisma.gameSchedule.create({
      data: {
        gameId: Number(gameId),
        date: new Date(`${date}T00:00:00`),
        startTime: String(startTime),
        endTime: String(endTime),
        capacity: Number(capacity),
        isActive: isActive ?? true,
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

    return NextResponse.json(schedule, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE SCHEDULE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ایجاد سانس" },
      { status: 500 }
    );
  }
}