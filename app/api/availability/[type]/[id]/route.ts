import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { isValidTime, validateRules, type Rule } from "@/lib/availability";
import { parseTargetType } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ type: string; id: string }> };

function intInRange(value: unknown, min: number, max: number) {
  const n = Number(value);

  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/**
 * ذخیره‌ی تنظیمات نوبت‌دهی و قوانین هفتگی یک بازی/ایونت (جایگزینی کامل قوانین)
 *
 * body: {
 *   settings: { durationMinutes, gapMinutes, minPlayers, maxPlayers, price? },
 *   rules: [{ weekday, startTime, endTime }]
 * }
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = await authorize("schedules.manage");
    if (!auth.ok) return auth.response;

    const { type: rawType, id: rawId } = await params;
    const type = parseTargetType(rawType);
    const id = Number(rawId);

    if (!type || !Number.isInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "شناسه نامعتبر است" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const settings = body?.settings ?? {};

    const durationMinutes = intInRange(settings.durationMinutes, 5, 600);
    const gapMinutes = intInRange(settings.gapMinutes, 0, 240);
    const minPlayers = intInRange(settings.minPlayers, 1, 500);
    const maxPlayers = intInRange(settings.maxPlayers, 1, 500);

    if (durationMinutes === null) {
      return NextResponse.json(
        { error: "مدت هر نوبت باید بین ۵ تا ۶۰۰ دقیقه باشد" },
        { status: 400 }
      );
    }

    if (gapMinutes === null) {
      return NextResponse.json(
        { error: "فاصله‌ی بین نوبت‌ها باید بین ۰ تا ۲۴۰ دقیقه باشد" },
        { status: 400 }
      );
    }

    if (minPlayers === null || maxPlayers === null || minPlayers > maxPlayers) {
      return NextResponse.json(
        { error: "حداقل و حداکثر نفرات معتبر نیست" },
        { status: 400 }
      );
    }

    const price =
      settings.price === undefined ? undefined : intInRange(settings.price, 0, 1_000_000_000);

    if (price === null) {
      return NextResponse.json(
        { error: "قیمت معتبر نیست" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body?.rules) || body.rules.length > 200) {
      return NextResponse.json(
        { error: "قوانین هفتگی نامعتبر است" },
        { status: 400 }
      );
    }

    const rules: Rule[] = body.rules.map((rule: Record<string, unknown>) => ({
      weekday: Number(rule.weekday),
      startTime: String(rule.startTime ?? ""),
      endTime: String(rule.endTime ?? ""),
      durationMinutes: intInRange(rule.durationMinutes, 5, 600),
      gapMinutes: intInRange(rule.gapMinutes, 0, 240),
      minPlayers: intInRange(rule.minPlayers, 1, 500),
      maxPlayers: intInRange(rule.maxPlayers, 1, 500),
      capacity: intInRange(rule.capacity, 1, 10000),
      price: intInRange(rule.price, 0, 1_000_000_000),
    }));
    for (const rule of rules) {
      const min = rule.minPlayers ?? minPlayers;
      const max = rule.maxPlayers ?? maxPlayers;
      const capacity = rule.capacity ?? max;

      if (min > max) {
        return NextResponse.json({ error: "حداقل نفرات یک روز نمی‌تواند از حداکثر بیشتر باشد" }, { status: 400 });
      }

      // اگر ظرفیت کل سانس از حداقل نفرات کمتر باشد، سانس هیچ‌وقت قابل رزرو نیست
      if (capacity < min) {
        return NextResponse.json({ error: "ظرفیت کل هر سانس نمی‌تواند از حداقل نفرات هر رزرو کمتر باشد" }, { status: 400 });
      }
    }

    if (rules.some((rule) => !isValidTime(rule.startTime) || !isValidTime(rule.endTime))) {
      return NextResponse.json(
        { error: "ساعت‌ها باید با فرمت HH:mm باشند" },
        { status: 400 }
      );
    }

    const rulesError = validateRules(rules);

    if (rulesError) {
      return NextResponse.json({ error: rulesError }, { status: 400 });
    }

    const exists =
      type === "game"
        ? await prisma.game.findUnique({ where: { id }, select: { id: true } })
        : await prisma.event.findUnique({ where: { id }, select: { id: true } });

    if (!exists) {
      return NextResponse.json({ error: "مورد پیدا نشد" }, { status: 404 });
    }

    const owner = type === "game" ? { gameId: id } : { eventId: id };

    await prisma.$transaction([
      type === "game"
        ? prisma.game.update({
            where: { id },
            data: {
              durationMinutes,
              gapMinutes,
              minPlayers,
              maxPlayers,
              // متن نمایشی مدت بازی با مقدار واقعی هماهنگ می‌ماند
              duration: `${durationMinutes} دقیقه`,
            },
          })
        : prisma.event.update({
            where: { id },
            data: {
              duration: durationMinutes,
              gapMinutes,
              minPlayers,
              capacity: maxPlayers,
              ...(price !== undefined ? { price } : {}),
            },
          }),
      prisma.availabilityRule.deleteMany({ where: owner }),
      prisma.availabilityRule.createMany({
        data: rules.map((rule) => ({
          ...owner,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          durationMinutes: rule.durationMinutes ?? durationMinutes,
          gapMinutes: rule.gapMinutes ?? gapMinutes,
          minPlayers: rule.minPlayers ?? minPlayers,
          maxPlayers: rule.maxPlayers ?? maxPlayers,
          capacity: rule.capacity ?? maxPlayers,
          price: rule.price ?? price ?? 0,
        })),
      }),
    ]);

    return NextResponse.json({ success: true, rules: rules.length });
  } catch (error) {
    console.error("AVAILABILITY SAVE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ذخیره‌ی زمان‌بندی" },
      { status: 500 }
    );
  }
}
