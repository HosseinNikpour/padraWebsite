-- این migration کاملاً idempotent است: اگر قبلاً نیمه‌کاره اجرا شده باشد، دوباره اجرا کردنش امن است.

-- نشست: افزایش نسخه برای ابطال نشست‌های قبلی
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- رزرو: وضعیت ارسال پیامک
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "smsSentAt" TIMESTAMP(3);
UPDATE "Booking" SET "smsSentAt" = COALESCE("paidAt", "updatedAt") WHERE "status" = 'CONFIRMED' AND "smsSentAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- پرداخت‌ها
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "authority" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "refId" TEXT,
    "cardPan" TEXT,
    "failCode" INTEGER,
    "failNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_status_chk" CHECK ("status" IN ('PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REFUNDED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_authority_key" ON "Payment"("authority");
CREATE INDEX IF NOT EXISTS "Payment_bookingId_idx" ON "Payment"("bookingId");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- انتقال پرداخت‌های موجود (تکراری وارد نمی‌شود)
INSERT INTO "Payment" ("bookingId", "authority", "amount", "status", "refId", "verifiedAt", "createdAt", "updatedAt")
SELECT "id", "paymentAuthority", "amount",
       CASE WHEN "status" = 'CONFIRMED' THEN 'PAID' WHEN "status" = 'CANCELLED' THEN 'FAILED' ELSE 'PENDING' END,
       "paymentRef", "paidAt", "createdAt", CURRENT_TIMESTAMP
FROM "Booking" WHERE "paymentAuthority" IS NOT NULL
ON CONFLICT ("authority") DO NOTHING;

-- تاریخچه‌ی وضعیت رزرو
CREATE TABLE IF NOT EXISTS "BookingStatusHistory" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BookingStatusHistory_bookingId_createdAt_idx" ON "BookingStatusHistory"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingStatusHistory_actorId_idx" ON "BookingStatusHistory"("actorId");

-- کد تأیید پیامکی
CREATE TABLE IF NOT EXISTS "OtpCode" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'BOOKING',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OtpCode_phone_createdAt_idx" ON "OtpCode"("phone", "createdAt");
CREATE INDEX IF NOT EXISTS "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- کلیدهای خارجی و قیدها: فقط اگر وجود نداشته باشند ساخته می‌شوند.
-- CHECKها با NOT VALID اضافه می‌شوند (فقط روی نوشتن‌های جدید اعمال می‌شوند).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('Payment', 'Payment_bookingId_fkey',
        $q$FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE$q$),
      ('BookingStatusHistory', 'BookingStatusHistory_bookingId_fkey',
        $q$FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE$q$),
      ('BookingStatusHistory', 'BookingStatusHistory_actorId_fkey',
        $q$FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE$q$),
      ('Booking', 'Booking_status_chk',
        $q$CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CANCELLED')) NOT VALID$q$),
      ('Booking', 'Booking_target_chk',
        $q$CHECK ("scheduleId" IS NOT NULL OR num_nonnulls("gameId", "eventId") = 1) NOT VALID$q$),
      ('Booking', 'Booking_quantity_chk', $q$CHECK ("quantity" >= 1) NOT VALID$q$),
      ('Booking', 'Booking_amount_chk', $q$CHECK ("amount" >= 0) NOT VALID$q$),
      ('AvailabilityRule', 'AvailabilityRule_target_chk',
        $q$CHECK (num_nonnulls("gameId", "eventId") = 1) NOT VALID$q$),
      ('AvailabilityRule', 'AvailabilityRule_weekday_chk',
        $q$CHECK ("weekday" BETWEEN 0 AND 6) NOT VALID$q$),
      ('LeaveRequest', 'LeaveRequest_status_chk',
        $q$CHECK ("status" IN ('PENDING_SUPERVISOR', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED')) NOT VALID$q$),
      ('ShiftSwapRequest', 'ShiftSwapRequest_status_chk',
        $q$CHECK ("status" IN ('PENDING_SUPERVISOR', 'APPROVED', 'REJECTED', 'CANCELLED')) NOT VALID$q$),
      ('TaskAssignment', 'TaskAssignment_status_chk',
        $q$CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'DONE')) NOT VALID$q$)
    ) AS t(tbl, name, def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.name AND conrelid = format('%I', c.tbl)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', c.tbl, c.name, c.def);
    END IF;
  END LOOP;
END $$;
