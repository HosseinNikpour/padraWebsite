/** بخش خالص (بدون DB) کد تأیید پیامکی؛ قابل تست مستقل. */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_GAP_MS = 60 * 1000;
export const OTP_TOKEN_TTL_SECONDS = 15 * 60;

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** hash با pepper (AUTH_SECRET) و شماره؛ کد ۶ رقمی بدون pepper با brute-force آفلاین بازیابی می‌شود. */
export function hashOtp(phone: string, code: string, pepper = process.env.AUTH_SECRET ?? "") {
  return createHash("sha256").update(`${pepper}:${phone}:${code}`).digest("hex");
}

export function otpMatches(phone: string, code: string, storedHash: string, pepper?: string) {
  const a = Buffer.from(hashOtp(phone, code, pepper));
  const b = Buffer.from(storedHash);

  return a.length === b.length && timingSafeEqual(a, b);
}

export function otpMessage(code: string) {
  return `پادراپارک\nکد تأیید شما: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
}
