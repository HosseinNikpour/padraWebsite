import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "padra_admin_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

type SessionPayload = {
  userId: number;
  roleId: number;
  /** نسخه‌ی نشست؛ با تغییر رمز در User افزایش می‌یابد و نشست‌های قبلی باطل می‌شوند */
  sessionVersion: number;
};

export async function createSession(
  userId: number,
  roleId: number,
  sessionVersion = 0
) {
  const token = await new SignJWT({
    userId,
    roleId,
    sv: sessionVersion,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      getSecretKey()
    );

    if (
      typeof payload.userId !== "number" ||
      typeof payload.roleId !== "number"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      roleId: payload.roleId,
      // توکن‌های قدیمی بدون sv معادل نسخه‌ی ۰ هستند
      sessionVersion: typeof payload.sv === "number" ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

/** React.cache: در یک درخواست سروری (layout + page) فقط یک بار از DB خوانده می‌شود. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive || !user.role.isActive) {
    return null;
  }

  // حساب مشتری هرگز نباید با نشست پرسنل کار کند (نشست مشتری کوکی و منطق جدا دارد)
  if (user.role.code === "CUSTOMER") {
    return null;
  }

  // نشست بعد از تغییر رمز باطل شده است
  if (user.sessionVersion !== session.sessionVersion) {
    return null;
  }

  return user;
});

export async function verifyPassword(
  password: string,
  passwordHash: string
) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * مقایسه‌ی رمز با زمان ثابت‌تر: اگر حساب وجود نداشت با یک hash معتبر ساختگی مقایسه می‌شود
 * تا زمان پاسخ، وجود یا نبود حساب را لو ندهد. (به‌جای hash ثابت و احتمالاً نامعتبرِ کپی‌شده در چند فایل)
 */
export async function verifyPasswordConstantTime(password: string, passwordHash: string | null | undefined) {
  if (passwordHash) return bcrypt.compare(password, passwordHash);

  dummyHashPromise ??= bcrypt.hash("padra-dummy-password", 12);
  await bcrypt.compare(password, await dummyHashPromise);

  return false;
}

/* ------------------------------------------------------------------ */
/* Authorization helpers                                              */
/* ------------------------------------------------------------------ */

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

type RoleWithPermissions = {
  code: string;
  permissions: { permission: { code: string; isActive?: boolean } }[];
};

/** نقش ADMIN همیشه به همه‌ی دسترسی‌ها (حتی دسترسی‌های جدید) دسترسی دارد. */
export function isAdminRole(role: { code: string }) {
  return role.code === "ADMIN";
}

export function getPermissionCodes(role: RoleWithPermissions) {
  return new Set(
    role.permissions
      .filter((item) => item.permission.isActive !== false)
      .map((item) => item.permission.code)
  );
}

export function hasPermission(user: CurrentUser, code: string) {
  if (isAdminRole(user.role) || getPermissionCodes(user.role).has(code)) return true;

  // مجوزهای پایه‌ی گردش کار برای نقش‌های استاندارد؛ کنترل زیرمجموعه و مرحله‌ی تأیید
  // همچنان در API مرخصی/شیفت انجام می‌شود. این fallback نقش‌های قدیمی را هم پوشش می‌دهد.
  const builtInRolePermissions: Record<string, string[]> = {
    SUPERVISOR: ["leave.approve.supervisor", "leave.viewAll", "shifts.view", "shifts.manage", "shifts.swap.approve", "attendance.view"],
    MANAGER: ["leave.approve.final", "leave.viewAll", "shifts.view", "shifts.manage", "shifts.swap.approve", "attendance.view", "attendance.manage"],
  };
  return builtInRolePermissions[user.role.code]?.includes(code) ?? false;
}

/**
 * آیا کاربر می‌تواند نقش داده‌شده را به کسی بدهد / کاربری با این نقش را مدیریت کند؟
 * فقط وقتی مجاز است که همه‌ی دسترسی‌های آن نقش را خودش هم داشته باشد
 * (جلوگیری از افزایش سطح دسترسی).
 */
export function canManageRole(
  user: CurrentUser,
  targetRole: RoleWithPermissions
) {
  if (isAdminRole(user.role)) return true;
  if (isAdminRole(targetRole)) return false;

  const mine = getPermissionCodes(user.role);

  for (const code of getPermissionCodes(targetRole)) {
    if (!mine.has(code)) return false;
  }

  return true;
}

export type AuthResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: NextResponse };

/**
 * برای استفاده در API routeها:
 *
 *   const auth = await authorize("games.manage");
 *   if (!auth.ok) return auth.response;
 *
 * اگر چند دسترسی داده شود، داشتن یکی از آن‌ها کافی است.
 */
export async function authorize(
  required: string | string[]
): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ابتدا وارد حساب کاربری شوید" },
        { status: 401 }
      ),
    };
  }

  const codes = Array.isArray(required) ? required : [required];

  if (!codes.some((code) => hasPermission(user, code))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "شما به این بخش دسترسی ندارید" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}

/** برای GETهای عمومی: آیا درخواست‌دهنده دسترسی مدیریتی دارد؟ */
export async function hasAccess(code: string) {
  const user = await getCurrentUser();

  return !!user && hasPermission(user, code);
}

/** برای صفحات سمت سرور در پنل ادمین. */
export async function requirePagePermission(code: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/account?next=/admin");
  }

  if (!hasPermission(user, code)) {
    redirect("/admin");
  }

  return user;
}
