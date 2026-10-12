import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
      },
      orderBy: [
        {
          categoryId: "asc",
        },
        {
          sortOrder: "asc",
        },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در دریافت آیتم‌های منو" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const price = Number(body.price);
    const categoryId = Number(body.categoryId);
    const sortOrder = Number(body.sortOrder ?? 0);
    const image = body.image|| null;

    if (!name) {
      return NextResponse.json(
        { error: "نام آیتم الزامی است" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(categoryId)) {
      return NextResponse.json(
        { error: "دسته‌بندی را انتخاب کنید" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "قیمت نامعتبر است" },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price,
        image,
        categoryId,
        sortOrder,
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در ایجاد آیتم" },
      { status: 500 }
    );
  }
}