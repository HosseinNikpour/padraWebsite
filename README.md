# پادراپارک (PADAR)

Next.js 16 + Prisma + PostgreSQL. رزرو بازی/ایونت با پرداخت زرین‌پال، منوی کافه، و پنل پرسنل (مرخصی، شیفت، حضور و غیاب، وظایف).

## اجرا
```bash
cp .env.example .env      # مقدارها را پر کنید
npm ci
npx prisma migrate deploy
npm run dev
```
راه‌اندازی اولیه: یک‌بار `POST /api/auth/setup` با `AUTH_SETUP_KEY` برای ساخت اولین مدیر (بعد از آن بسته می‌شود؛ کلید را از env حذف کنید).

## دستورها
`npm test` (تست‌های Node بدون وابستگی اضافه) · `npm run typecheck` · `npm run lint` · `npm run build`

## نکات استقرار
- **Rate limit:** در production حتماً `UPSTASH_REDIS_REST_*` را تنظیم کنید؛ بدون آن شمارنده در حافظه‌ی هر instance است.
- **پیامک:** `SMS_PROVIDER` (kavenegar یا webhook). بدون آن در production کد تأیید ارسال نمی‌شود و رزرو مهمان ممکن نیست.
- **Cron:** `vercel.json` هر ۱۰ دقیقه `/api/cron/reconcile` را اجرا می‌کند (نیاز به `CRON_SECRET`؛ در پلن Hobby فقط روزانه مجاز است).
- **Migration جدید:** `20261027090000_security_payments_otp`؛ قیدهای CHECK با `NOT VALID` اضافه شده‌اند. پس از اطمینان از پاک بودن داده: `ALTER TABLE ... VALIDATE CONSTRAINT ...`.

## رزرو حضوری (پرسنل)
در «پنل ← رزروها ← ثبت رزرو حضوری» (دسترسی `bookings.manage`) برای بازی و ایونت. بدون پرداخت؛ رزرو بلافاصله CONFIRMED می‌شود، از ظرفیت نوبت کم می‌شود و توضیحات الزامی است (`source = STAFF`).
