import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      }),

      prisma.permission.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      roles,
      permissions,
    });
  } catch (error) {
    console.error("GET_ROLES_ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت نقش‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "")
      .trim()
      .toUpperCase();
    const description = String(
      body.description ?? ""
    ).trim();

    if (!name || !code) {
      return NextResponse.json(
        {
          error: "نام و کد نقش الزامی است",
        },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: {
        code,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        {
          error: "این کد نقش قبلاً ثبت شده است",
        },
        { status: 409 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description: description || null,
        isActive: true,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_ROLE_ERROR:", error);

    return NextResponse.json(
      {
        error: "خطا در ایجاد نقش",
      },
      { status: 500 }
    );
  }
}