-- تنظیمات اختصاصی هر روز روی قانون هفتگی (null یعنی استفاده از تنظیمات عمومی بازی/ایونت)
-- idempotent است؛ اگر قبلاً از پوشه‌ی prisma/ دستی در Neon اجرا شده، مشکلی پیش نمی‌آید.
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "gapMinutes" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "minPlayers" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "maxPlayers" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "price" INTEGER;
