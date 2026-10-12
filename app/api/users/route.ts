import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("UNAUTHORIZED");
  }

  return currentUser;
}

export async function GET(_request: NextRequest) {
  try {
    await requireUser();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse("برای دسترسی باید وارد شوید.", 401);
    }

    console.error("GET USERS ERROR:", error);
    return errorResponse("خطا در دریافت کاربران", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const roleId = Number(body.roleId);

    if (!name || !username || !password || !Number.isInteger(roleId) || roleId < 1) {
      return errorResponse("تمام اطلاعات کاربر را وارد کنید.");
    }

    if (password.length < 8) {
      return errorResponse("رمز عبور باید حداقل ۸ کاراکتر باشد.");
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      return errorResponse("نقش انتخاب‌شده معتبر نیست.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, username, passwordHash, roleId },
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse("برای دسترسی باید وارد شوید.", 401);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("این نام کاربری قبلاً ثبت شده است.", 409);
    }

    console.error("POST USERS ERROR:", error);
    return errorResponse("خطا در ایجاد کاربر", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();
    const id = Number(body.id);
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const roleId = Number(body.roleId);
    const isActive = body.isActive;
    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !name ||
      !username ||
      !Number.isInteger(roleId) ||
      roleId < 1 ||
      typeof isActive !== "boolean"
    ) {
      return errorResponse("اطلاعات ویرایش کاربر کامل و معتبر نیست.");
    }

    if (password && password.length < 8) {
      return errorResponse("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      return errorResponse("نقش انتخاب‌شده معتبر نیست.");
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return errorResponse("کاربر موردنظر پیدا نشد.", 404);
    }

    const data: {
      name: string;
      username: string;
      roleId: number;
      isActive: boolean;
      passwordHash?: string;
    } = { name, username, roleId, isActive };

    // رمز قبلی فقط در صورت وارد کردن رمز جدید تغییر می‌کند.
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse("برای دسترسی باید وارد شوید.", 401);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("این نام کاربری قبلاً ثبت شده است.", 409);
    }

    console.error("PATCH USERS ERROR:", error);
    return errorResponse("خطا در ویرایش کاربر", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireUser();
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id < 1) {
      return errorResponse("شناسه کاربر معتبر نیست.");
    }

    if (Number(currentUser.id) === id) {
      return errorResponse("نمی‌توانید حساب کاربری خودتان را حذف کنید.");
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      return errorResponse("کاربر موردنظر پیدا نشد.", 404);
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse("برای دسترسی باید وارد شوید.", 401);
    }

    console.error("DELETE USERS ERROR:", error);
    return errorResponse("خطا در حذف کاربر", 500);
  }
}