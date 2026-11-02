-- گزارش‌های روزانه‌ی تسک (idempotent)
CREATE TABLE IF NOT EXISTS "TaskUpdate" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TaskUpdate_assignmentId_createdAt_idx" ON "TaskUpdate"("assignmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "TaskUpdate_userId_idx" ON "TaskUpdate"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskUpdate_assignmentId_fkey') THEN
    ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "TaskAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskUpdate_userId_fkey') THEN
    ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskUpdate_status_chk') THEN
    ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_status_chk"
      CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'DONE')) NOT VALID;
  END IF;
END $$;

-- سابقه‌ی قبلی: توضیح آخرِ هر انتساب به‌عنوان اولین گزارش منتقل می‌شود (فقط یک‌بار)
INSERT INTO "TaskUpdate" ("assignmentId", "userId", "status", "note", "createdAt")
SELECT a."id", a."userId", a."status", a."note", COALESCE(a."completedAt", a."updatedAt")
FROM "TaskAssignment" a
WHERE a."note" IS NOT NULL AND a."note" <> ''
  AND NOT EXISTS (SELECT 1 FROM "TaskUpdate" u WHERE u."assignmentId" = a."id");
