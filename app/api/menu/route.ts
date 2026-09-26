import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        items: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("MENU API ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت منو" },
      { status: 500 }
    );
  }
}