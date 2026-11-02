/**
 * ارسال پیامک
 *
 * ارائه‌دهنده با متغیرهای محیطی انتخاب می‌شود:
 *   SMS_PROVIDER=kavenegar   SMS_API_KEY=...   SMS_SENDER=...   (کاوه‌نگار، ارسال ساده)
 *   SMS_PROVIDER=webhook     SMS_WEBHOOK_URL=https://...   SMS_API_KEY=...  (هر سرویس دلخواه؛ POST JSON {to, text})
 *
 * بدون پیکربندی: در توسعه فقط لاگ می‌شود. در production، ارسال‌های «الزامی» (کد تأیید) خطا می‌دهند
 * و ارسال‌های غیرضروری (کد رهگیری) false برمی‌گردانند تا job تطبیق دوباره تلاش کند.
 *
 * ⚠️ اتصال به سرویس واقعی در این نسخه با سرویس زنده آزمایش نشده است؛ قبل از انتشار یک پیامک آزمایشی بفرستید.
 */
export function isSmsConfigured() {
  const provider = process.env.SMS_PROVIDER;

  if (provider === "kavenegar") return !!(process.env.SMS_API_KEY && process.env.SMS_SENDER);
  if (provider === "webhook") return !!process.env.SMS_WEBHOOK_URL;

  return false;
}

async function post(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), cache: "no-store" });

  if (!response.ok) throw new Error(`SMS provider responded ${response.status}`);

  return response;
}

/** true = ارسال شد؛ false = ارائه‌دهنده تنظیم نشده (فقط وقتی required نباشد). */
export async function sendSms(phone: string, message: string, options: { required?: boolean } = {}): Promise<boolean> {
  const provider = process.env.SMS_PROVIDER;

  if (!isSmsConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[SMS stub] to=${phone}\n${message}`);

      return true;
    }

    if (options.required) throw new Error("SMS provider is not configured");

    console.warn("SMS provider is not configured; message not sent");

    return false;
  }

  if (provider === "kavenegar") {
    const params = new URLSearchParams({
      receptor: phone,
      sender: process.env.SMS_SENDER as string,
      message,
    });

    await post(`https://api.kavenegar.com/v1/${encodeURIComponent(process.env.SMS_API_KEY as string)}/sms/send.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    return true;
  }

  await post(process.env.SMS_WEBHOOK_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
    },
    body: JSON.stringify({ to: phone, text: message }),
  });

  return true;
}

export type BookingSmsInfo = {
  phone: string;
  trackingCode: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  quantity: number;
};

/** پیامک کد رهگیری بعد از پرداخت موفق. true فقط اگر واقعاً ارسال شده باشد؛ خطا رزرو را خراب نمی‌کند. */
export async function sendBookingTrackingSms(info: BookingSmsInfo): Promise<boolean> {
  const persianDate = new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${info.date}T00:00:00Z`));

  const message = [
    "پادراپارک",
    `رزرو شما با موفقیت ثبت شد.`,
    `کد رهگیری: ${info.trackingCode}`,
    `${info.title} | ${persianDate} ساعت ${info.startTime} | ${info.quantity} نفر`,
  ].join("\n");

  try {
    return await sendSms(info.phone, message);
  } catch (error) {
    console.error("SMS SEND ERROR:", error);

    return false;
  }
}
