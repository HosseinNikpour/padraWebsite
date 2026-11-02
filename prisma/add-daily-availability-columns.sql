-- اجرای یک‌باره در Neon SQL Editor قبل از انتشار نسخه جدید.
-- فقط ستون‌های nullable اضافه می‌شوند؛ اطلاعات رزروها و قوانین قبلی حذف نمی‌شوند.
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "gapMinutes" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "minPlayers" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "maxPlayers" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "AvailabilityRule" ADD COLUMN IF NOT EXISTS "price" INTEGER;
