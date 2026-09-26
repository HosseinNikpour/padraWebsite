import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    if (!Number.isInteger(itemId)) {
      return NextResponse.json(
        { error: "شناسه نامعتبر است" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const price = Number(body.price);
    const categoryId = Number(body.categoryId);
    const sortOrder = Number(body.sortOrder ?? 0);
    const isActive = Boolean(body.isActive);
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

    const item = await prisma.menuItem.update({
      where: {
        id: itemId,
      },
      data: {
        name,
        description: description || null,
        price,
        image,
        categoryId,
        sortOrder,
        isActive,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در ویرایش آیتم" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    if (!Number.isInteger(itemId)) {
      return NextResponse.json(
        { error: "شناسه نامعتبر است" },
        { status: 400 }
      );
    }

    await prisma.menuItem.delete({
      where: {
        id: itemId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "خطا در حذف آیتم" },
      { status: 500 }
    );
  }
}
