import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در دریافت دسته‌بندی‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const sortOrder = Number(body.sortOrder ?? 0);

    if (!name) {
      return NextResponse.json(
        { error: "نام دسته‌بندی الزامی است" },
        { status: 400 }
      );
    }

    const category = await prisma.menuCategory.create({
      data: {
        name,
        sortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در ایجاد دسته‌بندی" },
      { status: 500 }
    );
  }
}