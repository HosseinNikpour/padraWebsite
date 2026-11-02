import { randomInt } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  BOOKING_WINDOW_DAYS,
  addDays,
  dbDate,
  isValidDate,
  nowInTehran,
  slotsForDate,
  timeToMinutes,
  type Rule,
  type Slot,
} from "@/lib/availability";

export type TargetType = "game" | "event";

export type Target = {
  type: TargetType;
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  durationMinutes: number;
  gapMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  isActive: boolean;
};

export type SlotStatus = "available" | "full" | "past";

export type SlotInfo = Slot & {
  booked: number;
  remaining: number;
  capacity: number;
  minPlayers: number;
  maxPlayers: number;
  price: number;
  durationMinutes: number;
  status: SlotStatus;
};

/** مدت نگه‌داشتن ظرفیت برای رزروهای در انتظار پرداخت (دقیقه) */
export const HOLD_MINUTES = 20;

/** کد رهگیری: حروف و ارقام بدون کاراکترهای مبهم (0/O و 1/I) — مثل PDR-K7M2QX */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTrackingCode() {
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return `PDR-${code}`;
}

export class BookingError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseTargetType(value: unknown): TargetType | null {
  return value === "game" || value === "event" ? value : null;
}

export async function loadTarget(
  type: TargetType,
  id: number
): Promise<Target | null> {
  if (!Number.isInteger(id) || id < 1) return null;

  if (type === "game") {
    const game = await prisma.game.findUnique({ where: { id } });

    if (!game) return null;

    return {
      type,
      id,
      name: game.name,
      description: game.description,
      image: game.image,
      price: game.price,
      durationMinutes: game.durationMinutes,
      gapMinutes: game.gapMinutes,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      isActive: game.isActive,
    };
  }

  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) return null;

  return {
    type,
    id,
    name: event.title,
    description: event.description,
    image: event.image,
    price: event.price,
    durationMinutes: event.duration ?? 20,
    gapMinutes: event.gapMinutes,
    minPlayers: event.minPlayers,
    maxPlayers: event.capacity ?? 10,
    isActive: event.isActive,
  };
}

export function targetWhere(target: Pick<Target, "type" | "id">) {
  return target.type === "game"
    ? { gameId: target.id }
    : { eventId: target.id };
}

export async function loadRules(
  target: Pick<Target, "type" | "id">
): Promise<Rule[]> {
  const rows = await prisma.availabilityRule.findMany({
    where: { ...targetWhere(target), isActive: true },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return rows.map((row) => ({
    weekday: row.weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    durationMinutes: row.durationMinutes,
    gapMinutes: row.gapMinutes,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    capacity: row.capacity,
    price: row.price,
  }));
}

/** رزروهایی که ظرفیت را اشغال می‌کنند: تأییدشده یا در انتظار پرداختِ منقضی‌نشده */
export function holdingFilter(now: Date) {
  return {
    OR: [
      { status: "CONFIRMED" },
      { status: "PENDING", expiresAt: { gt: now } },
    ],
  };
}

export { dbDate };

export type StatusSource = "SYSTEM" | "CUSTOMER" | "ADMIN" | "PAYMENT" | "CRON";

type HistoryDb = Pick<Prisma.TransactionClient, "bookingStatusHistory">;

/** ثبت تغییر وضعیت رزرو در تاریخچه (می‌تواند داخل transaction صدا زده شود). */
export async function recordStatus(
  db: HistoryDb,
  bookingId: number,
  fromStatus: string | null,
  toStatus: string,
  source: StatusSource,
  options: { actorId?: number | null; note?: string | null } = {}
) {
  await db.bookingStatusHistory.create({
    data: {
      bookingId,
      fromStatus,
      toStatus,
      source,
      actorId: options.actorId ?? null,
      note: options.note ?? null,
    },
  });
}

/** ساخت نوبت‌ها با تنظیمات اختصاصی هر روز و محاسبه ظرفیت از رزروهای واقعی */
export async function getSlots(
  target: Target,
  date: string,
  rules?: Rule[],
  now: Date = new Date()
): Promise<SlotInfo[]> {
  const allRules = rules ?? (await loadRules(target));
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dayRules = allRules.filter((rule) => rule.weekday === weekday);
  const slots: (Slot & { capacity: number; minPlayers: number; maxPlayers: number; price: number; durationMinutes: number })[] = [];

  for (const rule of dayRules) {
    const durationMinutes = rule.durationMinutes ?? target.durationMinutes;
    const gapMinutes = rule.gapMinutes ?? target.gapMinutes;
    const capacity = rule.capacity ?? rule.maxPlayers ?? target.maxPlayers;
    const minPlayers = rule.minPlayers ?? target.minPlayers;
    const maxPlayers = rule.maxPlayers ?? target.maxPlayers;
    const price = rule.price ?? target.price;
    for (const slot of slotsForDate([rule], date, durationMinutes, gapMinutes)) {
      slots.push({ ...slot, capacity, minPlayers, maxPlayers, price, durationMinutes });
    }
  }

  // سانس‌های تاریخ‌دار قدیمی ایونت هم همچنان قابل رزرو می‌مانند.
  if (target.type === "event") {
    const occurrences = await prisma.eventOccurrence.findMany({
      where: { eventId: target.id, eventDate: { gte: dbDate(date), lt: dbDate(addDays(date, 1)) }, isActive: true },
      orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }],
    });
    for (const occurrence of occurrences) {
      const capacity = occurrence.capacity ?? target.maxPlayers;
      slots.push({
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        capacity,
        minPlayers: target.minPlayers,
        maxPlayers: capacity,
        price: occurrence.price,
        durationMinutes: Math.max(1, timeToMinutes(occurrence.endTime) - timeToMinutes(occurrence.startTime)),
      });
    }
  }
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const uniqueSlots = [...new Map(slots.map((slot) => [slot.startTime, slot])).values()];
  if (uniqueSlots.length === 0) return [];

  const grouped = await prisma.booking.groupBy({
    by: ["startTime"],
    where: {
      ...targetWhere(target),
      date: dbDate(date),
      ...holdingFilter(now),
    },
    _sum: { quantity: true },
  });
  const bookedByStart = new Map(grouped.map((row) => [row.startTime, row._sum.quantity ?? 0]));
  const today = nowInTehran(now);

  return uniqueSlots.map((slot) => {
    const booked = bookedByStart.get(slot.startTime) ?? 0;
    const remaining = Math.max(0, slot.capacity - booked);
    let status: SlotStatus = "available";
    if (date < today.date || (date === today.date && timeToMinutes(slot.startTime) <= today.minutes)) {
      status = "past";
    } else if (remaining < Math.max(1, slot.minPlayers)) {
      status = "full";
    }
    return { ...slot, booked, remaining, status };
  });
}

/** روزهای هفته‌ای که حداقل یک نوبت دارند */
export function openWeekdays(
  rules: Rule[],
  durationMinutes: number,
  gapMinutes: number
) {
  const days = new Set<number>();

  for (let weekday = 0; weekday < 7; weekday++) {
    const ranges = rules.filter((rule) => rule.weekday === weekday);

    const hasSlots = ranges.some((rule) =>
      slotsForDate(
        [rule],
        // هر تاریخی با این روز هفته کافی است؛ فقط weekday مهم است
        addDays("2026-01-04", weekday),
        rule.durationMinutes ?? durationMinutes,
        rule.gapMinutes ?? gapMinutes
      ).length > 0
    );
    if (hasSlots) days.add(weekday);
  }

  return [...days];
}

/** کلید قفل (advisory lock) برای هر هدف و روز؛ جلوگیری از رزرو همزمانِ بیش از ظرفیت */
export function lockKey(target: Pick<Target, "type" | "id">, date: string) {
  const dayNumber = Math.floor(dbDate(date).getTime() / 86_400_000);
  const typeCode = target.type === "game" ? 1 : 2;

  return (typeCode * 10_000_000 + target.id) * 100_000 + dayNumber;
}

export type CreateBookingInput = {
  target: Target;
  date: string;
  startTime: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  userId?: number | null;
  /** ثبت حضوری توسط پرسنل: بدون پرداخت آنلاین، مستقیم CONFIRMED و با توضیحات */
  staff?: { id: number; name: string; note: string | null };
};

/** رزرو در وضعیت PENDING ساخته می‌شود و ظرفیت تا HOLD_MINUTES دقیقه نگه داشته می‌شود تا پرداخت انجام شود. */
export async function createBooking(input: CreateBookingInput) {
  const { target, date, startTime, quantity } = input;

  if (!target.isActive) {
    throw new BookingError(404, "این مورد در حال حاضر قابل رزرو نیست");
  }

  if (!isValidDate(date)) {
    throw new BookingError(400, "تاریخ معتبر نیست");
  }

  const today = nowInTehran();

  if (date < today.date) {
    throw new BookingError(400, "امکان رزرو برای تاریخ گذشته وجود ندارد");
  }

  if (date > addDays(today.date, BOOKING_WINDOW_DAYS)) {
    throw new BookingError(
      400,
      `رزرو فقط برای ${BOOKING_WINDOW_DAYS} روز آینده امکان‌پذیر است`
    );
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BookingError(400, "تعداد نفرات معتبر نیست");
  }

  // نوبت و تنظیمات روز از سمت سرور محاسبه می‌شوند؛ مقادیر کلاینت قابل اعتماد نیستند.
  const rules = await loadRules(target);
  const slots = await getSlots(target, date, rules);
  const slot = slots.find((item) => item.startTime === startTime);
  if (!slot) throw new BookingError(400, "این نوبت وجود ندارد");
  // پرسنل می‌توانند کمتر از حداقل نفرات هم ثبت کنند (تصمیم با خودشان است)؛ سقف ظرفیت همیشه اعمال می‌شود
  if (quantity > slot.maxPlayers || (!input.staff && quantity < slot.minPlayers)) {
    throw new BookingError(400, `تعداد نفرات باید بین ${slot.minPlayers} و ${slot.maxPlayers} باشد`);
  }

  // مشتری حضوری ممکن است وسط نوبت برسد؛ برای پرسنل فقط نوبتِ تمام‌شده بسته است
  if (date === today.date && timeToMinutes(input.staff ? slot.endTime : slot.startTime) <= today.minutes) {
    throw new BookingError(400, "زمان این نوبت گذشته است");
  }

  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey(target, date)})`;

      const aggregate = await tx.booking.aggregate({
        where: {
          ...targetWhere(target),
          date: dbDate(date),
          startTime: slot.startTime,
          ...holdingFilter(now),
        },
        _sum: { quantity: true },
      });

      const remaining = slot.capacity - (aggregate._sum.quantity ?? 0);

      if (remaining < quantity) {
        throw new BookingError(
          409,
          remaining <= 0
            ? "این نوبت همین الان تکمیل شد. لطفاً نوبت دیگری انتخاب کنید"
            : `فقط ${remaining} نفر ظرفیت این نوبت باقی مانده است`
        );
      }

      const created = await tx.booking.create({
        data: {
          ...targetWhere(target),
          date: dbDate(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          userId: input.userId ?? null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          quantity,
          // مبلغ همیشه سمت سرور از روی قیمت فعلی محاسبه می‌شود
          amount: slot.price * quantity,
          ...(input.staff
            ? {
                // پرداخت آنلاین ندارد: ظرفیت بلافاصله قطعی می‌شود. paidAt خالی می‌ماند تا job پیامک دخالت نکند.
                status: "CONFIRMED",
                expiresAt: null,
                trackingCode: generateTrackingCode(),
                source: "STAFF",
                note: input.staff.note,
                createdById: input.staff.id,
                createdByName: input.staff.name,
                smsSentAt: now,
              }
            : {
                status: "PENDING",
                expiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
              }),
        },
      });

      await recordStatus(
        tx,
        created.id,
        null,
        input.staff ? "CONFIRMED" : "PENDING",
        input.staff ? "ADMIN" : input.userId ? "CUSTOMER" : "SYSTEM",
        input.staff
          ? { actorId: input.staff.id, note: input.staff.note ? `ثبت حضوری: ${input.staff.note}` : "ثبت حضوری" }
          : { actorId: input.userId ?? null }
      );

      return created;
    },
    { timeout: 10_000 }
  );
}

/** تغییر وضعیت رزرو توسط ادمین؛ برگرداندن رزرو لغوشده به حالت فعال، ظرفیت را دوباره چک می‌کند. */
export async function changeBookingStatus(
  id: number,
  status: "PENDING" | "CONFIRMED" | "CANCELLED",
  actor?: { id: number }
) {
  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking) throw new BookingError(404, "رزرو پیدا نشد");

  if (booking.status === status) return booking;

  const target: Pick<Target, "type" | "id"> = booking.gameId
    ? { type: "game", id: booking.gameId }
    : { type: "event", id: booking.eventId as number };

  const date = booking.date.toISOString().slice(0, 10);

  // ظرفیت همان سانس (بر اساس تنظیمات آن روز) — نه ظرفیت عمومی بازی/ایونت
  let max = 10;

  if (status !== "CANCELLED") {
    const full = await loadTarget(target.type, target.id);

    if (full) {
      max = full.maxPlayers;

      const slot = (await getSlots(full, date)).find(
        (item) => item.startTime === booking.startTime
      );

      if (slot) max = slot.capacity;
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey(target, date)})`;

    if (status !== "CANCELLED") {

      const aggregate = await tx.booking.aggregate({
        where: {
          ...targetWhere(target),
          date: booking.date,
          startTime: booking.startTime,
          id: { not: booking.id },
          ...holdingFilter(new Date()),
        },
        _sum: { quantity: true },
      });

      if ((aggregate._sum.quantity ?? 0) + booking.quantity > max) {
        throw new BookingError(
          409,
          "ظرفیت این نوبت پر شده و امکان فعال کردن دوباره‌ی این رزرو نیست"
        );
      }
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status,
        expiresAt:
          status === "PENDING"
            ? new Date(Date.now() + HOLD_MINUTES * 60_000)
            : null,
        // تأیید دستی توسط ادمین (مثلاً پرداخت نقدی): در صورت نبود، کد رهگیری ساخته می‌شود
        ...(status === "CONFIRMED" && !booking.trackingCode
          ? { trackingCode: generateTrackingCode(), paidAt: booking.paidAt ?? new Date() }
          : {}),
      },
    });

    const manualConfirm = status === "CONFIRMED" && !booking.paymentRef;
    const cancelAfterPay = status === "CANCELLED" && booking.status === "CONFIRMED" && !!booking.paymentRef;

    await recordStatus(tx, id, booking.status, status, "ADMIN", {
      actorId: actor?.id ?? null,
      note: manualConfirm
        ? "تأیید دستی بدون پرداخت آنلاین"
        : cancelAfterPay
          ? "لغو رزرو پرداخت‌شده؛ بازگشت وجه باید دستی انجام شود"
          : null,
    });

    return updated;
  });
}

/**
 * رزروِ PENDING که مهلتش تمام شده و کاربر همین حالا از درگاه برگشته:
 * اگر ظرفیت هنوز خالی است دوباره نگه داشته می‌شود (true)، وگرنه false.
 */
export async function reacquireHold(booking: {
  id: number;
  gameId: number | null;
  eventId: number | null;
  date: Date;
  startTime: string;
  quantity: number;
}) {
  const target: Pick<Target, "type" | "id"> = booking.gameId
    ? { type: "game", id: booking.gameId }
    : { type: "event", id: booking.eventId as number };

  const date = booking.date.toISOString().slice(0, 10);
  const full = await loadTarget(target.type, target.id);
  let max = full?.maxPlayers ?? 10;

  if (full) {
    const slot = (await getSlots(full, date)).find(
      (item) => item.startTime === booking.startTime
    );

    if (slot) max = slot.capacity;
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey(target, date)})`;

    const aggregate = await tx.booking.aggregate({
      where: {
        ...targetWhere(target),
        date: booking.date,
        startTime: booking.startTime,
        id: { not: booking.id },
        ...holdingFilter(new Date()),
      },
      _sum: { quantity: true },
    });

    if ((aggregate._sum.quantity ?? 0) + booking.quantity > max) return false;

    await tx.booking.update({
      where: { id: booking.id },
      data: { expiresAt: new Date(Date.now() + 10 * 60_000) },
    });

    return true;
  });
}
