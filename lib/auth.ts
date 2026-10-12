import { cookies } from "next/headers";
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
};

export async function createSession(
  userId: number,
  roleId: number
) {
  const token = await new SignJWT({
    userId,
    roleId,
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
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
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

  return user;
}

export async function verifyPassword(
  password: string,
  passwordHash: string
) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

/**
 * Authorize an API operation using the permissions assigned to the current user's role.
 * Returns 401 when there is no valid active session and 403 when the user lacks permission.
 */
export async function authorizePermission(permissionCode: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, status: 401 as const };
  }

  const allowed = user.role.permissions.some(
    ({ permission }) =>
      permission.isActive && permission.code === permissionCode
  );

  if (!allowed) {
    return { user: null, status: 403 as const };
  }

  return { user, status: null };
}
