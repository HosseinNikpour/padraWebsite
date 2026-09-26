import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
} from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return NextResponse.json(
      { error: "خطا در دریافت کاربران" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const roleId = Number(body.roleId);

    if (!name || !username || !password || !roleId) {
      return NextResponse.json(
        {
          error: "تمام اطلاعات کاربر را وارد کنید",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "رمز عبور باید حداقل ۸ کاراکتر باشد",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: { username },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "این نام کاربری قبلاً ثبت شده است",
        },
        { status: 409 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || !role.isActive) {
      return NextResponse.json(
        {
          error: "نقش انتخاب‌شده معتبر نیست",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        roleId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(user, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      { error: "خطا در ایجاد کاربر" },
      { status: 500 }
    );
  }
}