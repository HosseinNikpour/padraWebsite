import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      gameId,
      date,
      startTime,
      endTime,
      duration,
      interval,
      capacity,
    } = body;

    if (
      !gameId ||
      !date ||
      !startTime ||
      !endTime ||
      !duration ||
      interval === undefined ||
      capacity === undefined
    ) {
      return NextResponse.json(
        { error: "اطلاعات تولید سانس کامل نیست" },
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

    const durationMinutes = Number(duration);
    const intervalMinutes = Number(interval);
    const capacityNumber = Number(capacity);

    if (
      durationMinutes <= 0 ||
      intervalMinutes < 0 ||
      capacityNumber <= 0
    ) {
      return NextResponse.json(
        { error: "مقادیر زمان و ظرفیت نامعتبر هستند" },
        { status: 400 }
      );
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "ساعت پایان باید بعد از ساعت شروع باشد" },
        { status: 400 }
      );
    }

    const schedules = [];

    let current = startMinutes;

    while (current + durationMinutes <= endMinutes) {
      const slotStart = minutesToTime(current);
      const slotEnd = minutesToTime(
        current + durationMinutes
      );

      schedules.push({
        gameId: Number(gameId),
        date: new Date(`${date}T00:00:00`),
        startTime: slotStart,
        endTime: slotEnd,
        capacity: capacityNumber,
        isActive: true,
      });

      current += durationMinutes + intervalMinutes;
    }

    if (schedules.length === 0) {
      return NextResponse.json(
        { error: "در بازه زمانی انتخاب‌شده سانسی ایجاد نمی‌شود" },
        { status: 400 }
      );
    }

    /*
     * جلوگیری از ایجاد سانس تکراری
     */

    const existing = await prisma.gameSchedule.findMany({
      where: {
        gameId: Number(gameId),
        date: new Date(`${date}T00:00:00`),
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const existingKeys = new Set(
      existing.map(
        (item) =>
          `${item.startTime}-${item.endTime}`
      )
    );

    const newSchedules = schedules.filter(
      (schedule) =>
        !existingKeys.has(
          `${schedule.startTime}-${schedule.endTime}`
        )
    );

    if (newSchedules.length === 0) {
      return NextResponse.json({
        created: 0,
        message: "تمام این سانس‌ها قبلاً ایجاد شده‌اند",
      });
    }

    await prisma.gameSchedule.createMany({
      data: newSchedules,
    });

    return NextResponse.json({
      created: newSchedules.length,
      total: schedules.length,
      skipped:
        schedules.length - newSchedules.length,
    });
  } catch (error) {
    console.error(
      "GENERATE SCHEDULES ERROR:",
      error
    );

    return NextResponse.json(
      { error: "خطا در تولید سانس‌ها" },
      { status: 500 }
    );
  }
}