/**
 * کلاینت درگاه پرداخت زرین‌پال (API نسخه‌ی ۴)
 *
 *   درخواست پرداخت : POST {api}/pg/v4/payment/request.json
 *   انتقال کاربر   : {pay}/pg/StartPay/{authority}
 *   بازگشت کاربر   : GET callback?Authority=...&Status=OK|NOK
 *   تأیید پرداخت   : POST {api}/pg/v4/payment/verify.json  (کد ۱۰۰ موفق، ۱۰۱ قبلاً تأیید شده)
 *
 * مبلغ‌ها در پروژه «تومان» هستند؛ به زرین‌پال به «ریال» (×۱۰) فرستاده می‌شوند
 * تا ابهامی در واحد درخواست و تأیید پیش نیاید.
 *
 * متغیرهای محیطی:
 *   ZARINPAL_MERCHANT_ID  شناسه‌ی پذیرنده (UUID)
 *   ZARINPAL_SANDBOX      "true" برای محیط آزمایشی (sandbox.zarinpal.com)
 */

export class ZarinpalError extends Error {
  code: number | null;

  constructor(message: string, code: number | null = null) {
    super(message);
    this.code = code;
  }
}

function config() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;

  if (!merchantId) {
    throw new ZarinpalError("درگاه پرداخت پیکربندی نشده است");
  }

  const sandbox = process.env.ZARINPAL_SANDBOX === "true";

  return {
    merchantId,
    api: sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com",
    pay: sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com",
  };
}

export const tomanToRial = (toman: number) => toman * 10;

type GatewayResponse = {
  data: Record<string, unknown> | null;
  error: { code: number; message: string } | null;
};

async function post(path: string, body: Record<string, unknown>): Promise<GatewayResponse> {
  const { api } = config();

  let response: Response;

  try {
    response = await fetch(`${api}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new ZarinpalError("ارتباط با درگاه پرداخت برقرار نشد");
  }

  let json: { data?: unknown; errors?: unknown };

  try {
    json = await response.json();
  } catch {
    throw new ZarinpalError("پاسخ نامعتبر از درگاه پرداخت دریافت شد");
  }

  // زرین‌پال در خطا data را [] برمی‌گرداند و errors را به‌صورت شیء (یا آرایه) می‌فرستد
  const rawError = Array.isArray(json.errors) ? json.errors[0] : json.errors;
  const hasError =
    rawError && typeof rawError === "object" && Object.keys(rawError).length > 0;

  const error = hasError
    ? {
        code: Number((rawError as { code?: unknown }).code),
        message: String((rawError as { message?: unknown }).message ?? ""),
      }
    : null;

  const data =
    json.data && typeof json.data === "object" && !Array.isArray(json.data)
      ? (json.data as Record<string, unknown>)
      : null;

  return { data, error };
}

export type PaymentRequestInput = {
  amountToman: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  orderId?: string;
};

export async function requestPayment(input: PaymentRequestInput) {
  const { merchantId, pay } = config();

  const { data, error } = await post("/pg/v4/payment/request.json", {
    merchant_id: merchantId,
    amount: tomanToRial(input.amountToman),
    callback_url: input.callbackUrl,
    description: input.description,
    metadata: {
      ...(input.mobile ? { mobile: input.mobile } : {}),
      ...(input.orderId ? { order_id: input.orderId } : {}),
    },
  });

  if (error || !data || Number(data.code) !== 100 || !data.authority) {
    console.error("ZARINPAL REQUEST ERROR:", error ?? data);

    throw new ZarinpalError(
      "ایجاد تراکنش در درگاه پرداخت ناموفق بود. لطفاً دوباره تلاش کنید",
      error?.code ?? null
    );
  }

  const authority = String(data.authority);

  return { authority, paymentUrl: `${pay}/pg/StartPay/${authority}` };
}

export function paymentUrlFor(authority: string) {
  return `${config().pay}/pg/StartPay/${authority}`;
}

export type VerifyResult =
  | { status: "verified" | "already"; refId: string; cardPan: string | null }
  | { status: "failed"; code: number | null; message: string };

/**
 * تأیید پرداخت. خطای ارتباطی (timeout، قطعی شبکه) به‌صورت ZarinpalError پرتاب می‌شود
 * تا بتوان بعداً دوباره تلاش کرد؛ رد قطعی توسط درگاه به‌صورت { status: "failed" } برمی‌گردد.
 */
export async function verifyPayment(input: {
  authority: string;
  amountToman: number;
}): Promise<VerifyResult> {
  const { merchantId } = config();

  const { data, error } = await post("/pg/v4/payment/verify.json", {
    merchant_id: merchantId,
    amount: tomanToRial(input.amountToman),
    authority: input.authority,
  });

  if (error) {
    return { status: "failed", code: Number.isFinite(error.code) ? error.code : null, message: error.message };
  }

  if (!data) {
    throw new ZarinpalError("پاسخ نامعتبر از درگاه پرداخت دریافت شد");
  }

  const code = Number(data.code);

  if (code === 100 || code === 101) {
    return {
      status: code === 100 ? "verified" : "already",
      refId: String(data.ref_id ?? ""),
      cardPan: data.card_pan ? String(data.card_pan) : null,
    };
  }

  return { status: "failed", code, message: String(data.message ?? "") };
}
