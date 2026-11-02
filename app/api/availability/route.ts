import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** فهرست همه‌ی بازی‌ها و ایونت‌ها با تنظیمات و قوانین هفتگی (برای پنل ادمین) */
export async function GET() {
  try {
    const auth = await authorize("schedules.view");
    if (!auth.ok) return auth.response;

    const [games, events] = await Promise.all([
      prisma.game.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          rules: {
            where: { isActive: true },
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      }),
      prisma.event.findMany({
        orderBy: { id: "asc" },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      }),
    ]);

    const mapRules = (rules: {
      weekday: number; startTime: string; endTime: string;
      durationMinutes: number | null; gapMinutes: number | null;
      minPlayers: number | null; maxPlayers: number | null;
      capacity: number | null; price: number | null;
    }[]) => rules.map((rule) => ({
      weekday: rule.weekday, startTime: rule.startTime, endTime: rule.endTime,
      durationMinutes: rule.durationMinutes, gapMinutes: rule.gapMinutes,
      minPlayers: rule.minPlayers, maxPlayers: rule.maxPlayers,
      capacity: rule.capacity, price: rule.price,
    }));

    return NextResponse.json({
      games: games.map((game) => ({
        type: "game" as const,
        id: game.id,
        name: game.name,
        isActive: game.isActive,
        settings: {
          durationMinutes: game.durationMinutes,
          gapMinutes: game.gapMinutes,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          capacity: game.maxPlayers,
          price: game.price,
        },
        rules: mapRules(game.rules),
      })),
      events: events.map((event) => ({
        type: "event" as const,
        id: event.id,
        name: event.title,
        isActive: event.isActive,
        settings: {
          durationMinutes: event.duration ?? 20,
          gapMinutes: event.gapMinutes,
          minPlayers: event.minPlayers,
          maxPlayers: event.capacity ?? 10,
          capacity: event.capacity ?? 10,
          price: event.price,
        },
        rules: mapRules(event.rules),
      })),
    });
  } catch (error) {
    console.error("AVAILABILITY LIST ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت زمان‌بندی‌ها" },
      { status: 500 }
    );
  }
}
