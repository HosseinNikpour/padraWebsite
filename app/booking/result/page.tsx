import Link from "next/link";

import "../../account/account.css";
import CopyCodeButton from "./CopyCodeButton";

export const metadata = { title: "نتیجه‌ی پرداخت | پادرا" };

const MESSAGES: Record<string, { title: string; text: string }> = {
  failed: {
    title: "پرداخت انجام نشد",
    text: "پرداخت ناموفق بود یا لغو شد و رزرو شما ثبت نشد. اگر مبلغی از حساب شما کسر شده، تا ۷۲ ساعت به حساب‌تان برمی‌گردد.",
  },
  expired: {
    title: "مهلت پرداخت تمام شد",
    text: "مهلت پرداخت به پایان رسید و این نوبت در این فاصله رزرو شد. اگر مبلغی کسر شده، تا ۷۲ ساعت به حساب‌تان برمی‌گردد. لطفاً نوبت دیگری انتخاب کنید.",
  },
  error: {
    title: "در تأیید پرداخت خطایی رخ داد",
    text: "ارتباط با درگاه برای تأیید پرداخت برقرار نشد. نگران نباشید: سیستم به‌صورت خودکار پرداخت شما را دوباره بررسی می‌کند و در صورت موفق بودن پرداخت، رزرو ثبت و کد رهگیری پیامک می‌شود. چند دقیقه بعد وضعیت را در پروفایل ببینید یا با شماره موبایل و کد رهگیری پیگیری کنید.",
  },
  notfound: {
    title: "تراکنش پیدا نشد",
    text: "اطلاعات این تراکنش معتبر نیست.",
  },
};

export default async function BookingResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; code?: string }>;
}) {
  const { status, code } = await searchParams;

  const trackingCode = code && /^PDR-[A-Z0-9]{6}$/.test(code) ? code : null;
  const success = status === "success" && trackingCode;
  const message = MESSAGES[status ?? ""] ?? MESSAGES.notfound;

  return (
    <main className="acc-page" dir="rtl">
      <div className="acc-container acc-container--narrow">
        <Link href="/" className="acc-brand">
          پادرا<span>پارک</span>
        </Link>

        <section className="acc-card acc-result">
          <div className={`acc-result-icon ${success ? "ok" : "fail"}`}>
            {success ? "✓" : "!"}
          </div>

          {success ? (
            <>
              <h1>پرداخت موفق بود؛ رزرو شما ثبت شد</h1>

              <div className="acc-tracking acc-tracking--big">
                <span>کد رهگیری</span>
                <strong dir="ltr">{trackingCode}</strong>
              </div>

              <CopyCodeButton code={trackingCode} />

              <p>
                کد رهگیری برای شما پیامک می‌شود؛ اگر پیامک دیر رسید، همین کد را ذخیره کنید
                (با شماره موبایل و این کد می‌توانید رزرو را پیگیری کنید). لطفاً چند دقیقه قبل از
                شروع نوبت حضور داشته باشید.
              </p>
            </>
          ) : (
            <>
              <h1>{message.title}</h1>
              <p>{message.text}</p>
            </>
          )}

          <div className="acc-result-actions">
            <Link className="acc-button" href="/profile">
              پروفایل و سوابق رزرو
            </Link>
            <Link className="acc-button acc-button--ghost" href="/">
              بازگشت به سایت
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
