import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { hashPassword, verifyPassword, verifyPasswordConstantTime } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// نشست جدا نگه داشته می‌شود تا مسیرهای عمومی سایت از دسترسی‌های پرسنلی جدا بمانند؛ هویت هر دو از User خوانده می‌شود.
const CUSTOMER_COOKIE = "padra_customer_session";
const MAX_AGE = 60 * 60 * 24 * 30;
function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}
export { hashPassword, verifyPassword, verifyPasswordConstantTime };
export async function createCustomerSession(customerId: number, sessionVersion = 0) {
  const token = await new SignJWT({ customerId, typ: "customer", sv: sessionVersion }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secretKey());
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
export async function deleteCustomerSession() { const store = await cookies(); store.delete(CUSTOMER_COOKIE); }
export async function getCurrentCustomer() {
  try {
    const store = await cookies();
    const token = store.get(CUSTOMER_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.typ !== "customer" || typeof payload.customerId !== "number") return null;
    const user = await prisma.user.findUnique({ where: { id: payload.customerId }, include: { role: { select: { code: true, isActive: true } } } });
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    return user && user.sessionVersion === sv && user.isActive && user.role.isActive && user.role.code === "CUSTOMER" && user.phone
      ? { id: user.id, name: user.name, phone: user.phone, isActive: user.isActive }
      : null;
  } catch { return null; }
}
