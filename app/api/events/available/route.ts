import { NextResponse } from "next/server";
import { addDays, BOOKING_WINDOW_DAYS, generateSlots, nowInTehran, timeToMinutes, weekdayOf } from "@/lib/availability";
import { loadRules, loadTarget } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

/** ایونت‌های فعال همراه با تمام سانس‌های آزاد در بازه رزرو */
export async function GET() {
  try {
    const now = new Date();
    const today = nowInTehran(now);
    const lastDate = addDays(today.date, BOOKING_WINDOW_DAYS);
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, image: true, genre: true, duration: true, price: true, capacity: true, minPlayers: true },
    });

    const result = await Promise.all(events.map(async (event) => {
      const target = await loadTarget("event", event.id);
      if (!target || !target.isActive) return { ...event, slots: [] };
      const rules = await loadRules(target);

      const grouped = await prisma.booking.groupBy({
        by: ["date", "startTime"],
        where: {
          eventId: event.id,
          date: { gte: new Date(`${today.date}T00:00:00Z`), lte: new Date(`${lastDate}T00:00:00Z`) },
          OR: [
            { status: "CONFIRMED" },
            { status: "PENDING", expiresAt: { gt: now } },
          ],
        },
        _sum: { quantity: true },
      });
      const bookedByKey = new Map(grouped.map((row) => [`${row.date.toISOString().slice(0, 10)}|${row.startTime}`, row._sum.quantity ?? 0]));
      const slots: { date: string; startTime: string; endTime: string; price: number; capacity: number; remaining: number }[] = [];

      for (let offset = 0; offset <= BOOKING_WINDOW_DAYS; offset++) {
        const date = addDays(today.date, offset);
        const weekday = weekdayOf(date);
        for (const rule of rules.filter((item) => item.weekday === weekday)) {
          const duration = rule.durationMinutes ?? target.durationMinutes;
          const gap = rule.gapMinutes ?? target.gapMinutes;
          const capacity = rule.capacity ?? rule.maxPlayers ?? target.maxPlayers;
          const minPlayers = rule.minPlayers ?? target.minPlayers;
          const price = rule.price ?? target.price;
          for (const slot of generateSlots([rule], duration, gap)) {
            if (date === today.date && timeToMinutes(slot.startTime) <= today.minutes) continue;
            const booked = bookedByKey.get(`${date}|${slot.startTime}`) ?? 0;
            const remaining = Math.max(0, capacity - booked);
            if (remaining < Math.max(1, minPlayers)) continue;
            slots.push({ date, startTime: slot.startTime, endTime: slot.endTime, price, capacity, remaining });
          }
        }
      }

      // سانس‌های تاریخ‌دار قدیمی نیز در صفحه اصلی نمایش داده می‌شوند.
      const occurrences = await prisma.eventOccurrence.findMany({
        where: { eventId: event.id, isActive: true, eventDate: { gte: new Date(`${today.date}T00:00:00Z`), lt: new Date(`${addDays(lastDate, 1)}T00:00:00Z`) } },
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { sortOrder: "asc" }],
      });
      for (const occurrence of occurrences) {
        const date = occurrence.eventDate.toISOString().slice(0, 10);
        if (date < today.date || date > lastDate) continue;
        if (date === today.date && timeToMinutes(occurrence.startTime) <= today.minutes) continue;
        const capacity = occurrence.capacity ?? target.maxPlayers;
        const booked = bookedByKey.get(`${date}|${occurrence.startTime}`) ?? 0;
        const remaining = Math.max(0, capacity - booked);
        if (remaining < Math.max(1, target.minPlayers)) continue;
        slots.push({ date, startTime: occurrence.startTime, endTime: occurrence.endTime, price: occurrence.price, capacity, remaining });
      }
      const deduped = new Map(slots.map((slot) => [`${slot.date}|${slot.startTime}`, slot]));
      slots.splice(0, slots.length, ...deduped.values());
      slots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      return { ...event, slots };
    }));

    return NextResponse.json(result.filter((event) => event !== null), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("AVAILABLE EVENTS GET ERROR:", error);
    return NextResponse.json({ error: "خطا در دریافت سانس‌های ایونت" }, { status: 500 });
  }
}
