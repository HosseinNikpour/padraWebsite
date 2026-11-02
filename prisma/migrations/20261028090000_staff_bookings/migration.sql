-- رزرو حضوری توسط پرسنل (idempotent)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ONLINE';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdById" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_source_chk' AND conrelid = '"Booking"'::regclass) THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_source_chk" CHECK ("source" IN ('ONLINE', 'STAFF'));
  END IF;
END $$;
