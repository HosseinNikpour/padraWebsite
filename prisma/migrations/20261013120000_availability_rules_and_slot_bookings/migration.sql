-- Game: تنظیمات رزرو نوبتی
ALTER TABLE "Game"
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "gapMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "minPlayers" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "maxPlayers" INTEGER NOT NULL DEFAULT 10;

-- مدت نوبت را از متن «duration» فعلی (مثل «۲۰ دقیقه») استخراج می‌کنیم
UPDATE "Game"
SET "durationMinutes" = CASE
  WHEN s.digits ~ '^[0-9]{1,3}$' AND s.digits::int > 0 THEN s.digits::int
  ELSE 20
END
FROM (
  SELECT "id" AS gid,
         regexp_replace(
           translate("duration", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
           '[^0-9]', '', 'g'
         ) AS digits
  FROM "Game"
) s
WHERE "Game"."id" = s.gid;

-- Event: تنظیمات رزرو نوبتی
ALTER TABLE "Event"
  ADD COLUMN "gapMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "minPlayers" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0;

-- قوانین هفتگی
CREATE TABLE "AvailabilityRule" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER,
    "eventId" INTEGER,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AvailabilityRule_one_target_chk"
      CHECK (("gameId" IS NULL) <> ("eventId" IS NULL)),
    CONSTRAINT "AvailabilityRule_weekday_chk"
      CHECK ("weekday" BETWEEN 0 AND 6)
);

CREATE INDEX "AvailabilityRule_gameId_idx" ON "AvailabilityRule"("gameId");
CREATE INDEX "AvailabilityRule_eventId_idx" ON "AvailabilityRule"("eventId");

ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "AvailabilityRule_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "AvailabilityRule_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking: رزرو به‌جای scheduleId به (تاریخ + ساعت شروع) وصل می‌شود
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_gameId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_scheduleId_fkey";

ALTER TABLE "Booking"
  ALTER COLUMN "gameId" DROP NOT NULL,
  ALTER COLUMN "scheduleId" DROP NOT NULL,
  ADD COLUMN "eventId" INTEGER,
  ADD COLUMN "date" DATE,
  ADD COLUMN "startTime" TEXT,
  ADD COLUMN "endTime" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

-- رزروهای قبلی (اگر وجود داشته باشند) از روی سانس قدیمی‌شان پر می‌شوند
UPDATE "Booking" b
SET "date" = gs."date"::date,
    "startTime" = gs."startTime",
    "endTime" = gs."endTime"
FROM "GameSchedule" gs
WHERE gs."id" = b."scheduleId";

ALTER TABLE "Booking"
  ALTER COLUMN "date" SET NOT NULL,
  ALTER COLUMN "startTime" SET NOT NULL,
  ALTER COLUMN "endTime" SET NOT NULL;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_one_target_chk"
  CHECK (("gameId" IS NULL) <> ("eventId" IS NULL));

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "GameSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Booking_gameId_date_startTime_idx" ON "Booking"("gameId", "date", "startTime");
CREATE INDEX "Booking_eventId_date_startTime_idx" ON "Booking"("eventId", "date", "startTime");
CREATE INDEX "Booking_date_idx" ON "Booking"("date");
DROP INDEX IF EXISTS "Booking_gameId_idx";
