/** سیاست یکسان رمز عبور برای پرسنل و مشتری (قابل استفاده در سرور و مرورگر). */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "88888888", "12341234",
  "password", "password1", "password123", "passw0rd", "qwertyui", "qwerty123", "qwertyuiop", "iloveyou",
  "abcd1234", "abc12345", "1q2w3e4r", "1qaz2wsx", "admin123", "admin1234", "letmein1", "welcome1",
  "padra123", "padrapark", "padra1234",
]);

/** پیام خطای فارسی یا null اگر رمز قابل قبول است. */
export function validatePassword(password: string, context: { username?: string; phone?: string } = {}): string | null {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return `رمز عبور باید بین ${MIN_PASSWORD_LENGTH} تا ${MAX_PASSWORD_LENGTH} کاراکتر باشد`;
  }

  const lower = password.toLowerCase();

  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) {
    return "این رمز عبور بسیار رایج است؛ رمز دیگری انتخاب کنید";
  }

  if (context.username && lower === context.username.toLowerCase()) {
    return "رمز عبور نباید با نام کاربری یکسان باشد";
  }

  if (context.phone && password.replace(/\D/g, "") === context.phone.replace(/\D/g, "")) {
    return "رمز عبور نباید همان شماره موبایل باشد";
  }

  return null;
}
