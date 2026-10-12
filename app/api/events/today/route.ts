
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        occurrences: {
          where: {
            eventDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            isActive: true,
          },

          orderBy: [
            {
              startTime: "asc",
            },
            {
              sortOrder: "asc",
            },
          ],
        },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("TODAY EVENTS GET ERROR:", error);

    return NextResponse.json(
      {
        error: "خطا در دریافت ایونت‌های امروز",
      },
      {
        status: 500,
      }
    );
  }
}

