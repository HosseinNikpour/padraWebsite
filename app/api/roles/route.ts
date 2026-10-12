import { NextResponse } from "next/server";
import { authorizePermission } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const authorization = await authorizePermission("roles.view");
    if (!authorization.user) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "دسترسی غیرمجاز" : "شما مجوز انجام این عملیات را ندارید" },
        { status: authorization.status }
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
    const authorization = await authorizePermission("roles.manage");
    if (!authorization.user) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "دسترسی غیرمجاز" : "شما مجوز انجام این عملیات را ندارید" },
        { status: authorization.status }
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