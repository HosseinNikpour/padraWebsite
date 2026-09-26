import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const gameId = Number(id);

    if (!Number.isInteger(gameId)) {
      return NextResponse.json(
        { error: "شناسه بازی معتبر نیست" },
        { status: 400 }
      );
    }

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

    const game = await prisma.game.update({
      where: {
        id: gameId,
      },
      data: {
        name,
        description: description || null,
        image,
        duration,
        capacity,
        price,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error("GAMES PUT ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ویرایش بازی" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const gameId = Number(id);

    if (!Number.isInteger(gameId)) {
      return NextResponse.json(
        { error: "شناسه بازی معتبر نیست" },
        { status: 400 }
      );
    }

    await prisma.game.delete({
      where: {
        id: gameId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("GAMES DELETE ERROR:", error);

    return NextResponse.json(
      { error: "خطا در حذف بازی" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const gameId = Number(id);

    if (!Number.isInteger(gameId)) {
      return NextResponse.json(
        { error: "شناسه بازی نامعتبر است" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: {
        id: gameId,
      },
    });

    if (!game || !game.isActive) {
      return NextResponse.json(
        { error: "بازی پیدا نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("GET GAME ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت بازی" },
      { status: 500 }
    );
  }
}