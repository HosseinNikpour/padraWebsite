import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMinutes } from "@/lib/availability";
import { authorize, hasAccess } from "@/lib/auth";

export async function GET() {
  try {
    const canSeeAll = await hasAccess("games.view");

    const games = await prisma.game.findMany({
      where: canSeeAll ? undefined : { isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("GAMES GET ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت بازی‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize("games.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const image = body.image ? String(body.image) : null;

    const duration = String(body.duration ?? "").trim();
    const capacity = String(body.capacity ?? "").trim();

    const price = Number(body.price ?? 0);
    const sortOrder = Number(body.sortOrder ?? 0);

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : true;

    if (!name) {
      return NextResponse.json(
        { error: "نام بازی الزامی است" },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { error: "مدت بازی الزامی است" },
        { status: 400 }
      );
    }

    if (!capacity) {
      return NextResponse.json(
        { error: "ظرفیت بازی الزامی است" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "قیمت معتبر نیست" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json(
        { error: "ترتیب نمایش معتبر نیست" },
        { status: 400 }
      );
    }

    const game = await prisma.game.create({
      data: {
        name,
        description: description || null,
        image,
        duration,
        // اگر مدت بازی عدد داشته باشد (مثلاً «۲۰ دقیقه»)، مدت واقعی نوبت‌ها هم همان می‌شود
        ...(parseMinutes(duration) ? { durationMinutes: parseMinutes(duration) as number } : {}),
        capacity,
        price,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("GAMES POST ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ایجاد بازی" },
      { status: 500 }
    );
  }
}