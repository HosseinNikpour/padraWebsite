import { NextResponse } from "next/server";

import {
  createSession,
  verifyPassword,
} from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        {
          error: "نام کاربری و رمز عبور را وارد کنید",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive || !user.role.isActive) {
      return NextResponse.json(
        {
          error: "نام کاربری یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          error: "نام کاربری یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    await createSession(
      user.id,
      user.roleId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return NextResponse.json(
      {
        error: "خطایی در ورود به سامانه رخ داد",
      },
      { status: 500 }
    );
  }
}