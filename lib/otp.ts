import { jwtVerify, SignJWT } from "jose";

import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_GAP_MS,
  OTP_TOKEN_TTL_SECONDS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtp,
  otpMatches,
  otpMessage,
} from "@/lib/otp-core";

export class OtpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) throw new Error("AUTH_SECRET is not configured");

  return new TextEncoder().encode(secret);
}

/** ایجاد و ارسال کد. هر شماره حداقل ۶۰ ثانیه بین دو درخواست فاصله دارد. */
export async function requestOtp(phone: string) {
  const last = await prisma.otpCode.findFirst({
    where: { phone, purpose: "BOOKING" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_GAP_MS) {
    const wait = Math.ceil((OTP_RESEND_GAP_MS - (Date.now() - last.createdAt.getTime())) / 1000);

    throw new OtpError(429, `لطفاً ${wait} ثانیه دیگر دوباره درخواست دهید`);
  }

  const code = generateOtpCode();
  const row = await prisma.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  try {
    await sendSms(phone, otpMessage(code), { required: true });
  } catch (error) {
    // کدی که ارسال نشد نباید فاصله‌ی ۶۰ ثانیه‌ای را مصرف کند
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => undefined);
    console.error("OTP SMS ERROR:", error);

    throw new OtpError(502, "ارسال پیامک ممکن نشد. کمی بعد دوباره تلاش کنید");
  }
}

/** بررسی کد؛ در صورت موفقیت توکن کوتاه‌مدت و تک‌منظوره برای ثبت رزرو برمی‌گرداند. */
export async function verifyOtp(phone: string, code: string) {
  const row = await prisma.otpCode.findFirst({
    where: { phone, purpose: "BOOKING", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!row || row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError(400, "کد منقضی شده یا نامعتبر است. کد جدید دریافت کنید");
  }

  // شمارش تلاش قبل از مقایسه تا درخواست‌های هم‌زمان نتوانند سقف را دور بزنند
  const bumped = await prisma.otpCode.updateMany({
    where: { id: row.id, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });

  if (bumped.count === 0 || !otpMatches(phone, code, row.codeHash)) {
    throw new OtpError(400, "کد واردشده صحیح نیست");
  }

  await prisma.otpCode.update({ where: { id: row.id }, data: { verifiedAt: new Date() } });

  return new SignJWT({ phone, otpId: row.id, purpose: "booking" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** توکن را بررسی می‌کند (بدون مصرف). شناسه‌ی کد را برمی‌گرداند یا null. */
export async function checkOtpToken(token: unknown, phone: string): Promise<number | null> {
  if (typeof token !== "string" || !token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());

    if (payload.purpose !== "booking" || payload.phone !== phone || typeof payload.otpId !== "number") {
      return null;
    }

    const row = await prisma.otpCode.findUnique({ where: { id: payload.otpId } });

    if (!row || row.usedAt || !row.verifiedAt || row.phone !== phone) return null;

    return row.id;
  } catch {
    return null;
  }
}

/** مصرف یک‌باره‌ی کد بعد از ثبت موفق رزرو. */
export async function consumeOtp(id: number) {
  await prisma.otpCode.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
}
