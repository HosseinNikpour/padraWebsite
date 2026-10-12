import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, username: true, isActive: true, roleId: true,
        role: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: "خطا در دریافت کاربران" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const roleId = Number(body.roleId);
    if (!name || !username || !password || !Number.isInteger(roleId) || roleId < 1) {
      return NextResponse.json({ error: "تمام اطلاعات کاربر را وارد کنید" }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 });

    const [existingUser, role] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (existingUser) return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    if (!role || !role.isActive) return NextResponse.json({ error: "نقش انتخاب‌شده معتبر نیست" }, { status: 400 });

    const user = await prisma.user.create({
      data: { name, username, passwordHash: await hashPassword(password), roleId, isActive: true },
      select: { id: true, name: true, username: true, isActive: true, roleId: true, role: { select: { id: true, name: true, code: true } }, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    }
    return NextResponse.json({ error: "خطا در ایجاد کاربر" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const id = Number(body.id);
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const roleId = Number(body.roleId);
    const isActive = body.isActive === true;
    const password = body.password === undefined ? "" : String(body.password);

    if (!Number.isInteger(id) || id < 1 || !name || !username || !Number.isInteger(roleId) || roleId < 1) {
      return NextResponse.json({ error: "اطلاعات واردشده معتبر نیست" }, { status: 400 });
    }
    if (password && password.length < 8) return NextResponse.json({ error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد" }, { status: 400 });

    const [existingUser, role, duplicateUsername] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (!existingUser) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
    if (duplicateUsername && duplicateUsername.id !== id) return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
    if (!role || !role.isActive) return NextResponse.json({ error: "نقش انتخاب‌شده معتبر نیست" }, { status: 400 });

    const data: { name: string; username: string; roleId: number; isActive: boolean; passwordHash?: string } = { name, username, roleId, isActive };
    if (password) data.passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id }, data,
      select: { id: true, name: true, username: true, isActive: true, roleId: true, role: { select: { id: true, name: true, code: true } }, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return NextResponse.json({ error: "خطا در ویرایش کاربر" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "شناسه کاربر معتبر نیست" }, { status: 400 });
    if (Number((currentUser as { id?: number }).id) === id) return NextResponse.json({ error: "امکان حذف حساب کاربری خودتان وجود ندارد" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
  }
}
