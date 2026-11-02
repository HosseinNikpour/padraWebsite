-- Merge customer accounts into User while preserving booking ownership.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

INSERT INTO "Role" ("name", "code", "description", "isActive", "createdAt", "updatedAt")
VALUES ('مشتری', 'CUSTOMER', 'حساب مشتریان سایت', TRUE, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "isActive" = TRUE;

CREATE TEMP TABLE "_CustomerUserMap" ("oldCustomerId" INTEGER PRIMARY KEY, "newUserId" INTEGER NOT NULL);
INSERT INTO "User" ("name", "username", "passwordHash", "roleId", "isActive", "phone", "createdAt", "updatedAt")
SELECT c."name", ('customer_' || c."id"::text || '_' || c."phone"), c."passwordHash", r."id", c."isActive", c."phone", c."createdAt", c."updatedAt"
FROM "Customer" c CROSS JOIN "Role" r WHERE r."code" = 'CUSTOMER'
ON CONFLICT ("phone") DO NOTHING;
INSERT INTO "_CustomerUserMap" ("oldCustomerId", "newUserId")
SELECT c."id", u."id" FROM "Customer" c JOIN "User" u ON u."phone" = c."phone";

ALTER TABLE "Booking" ADD COLUMN "userId" INTEGER;
UPDATE "Booking" b SET "userId" = m."newUserId" FROM "_CustomerUserMap" m WHERE b."customerId" = m."oldCustomerId";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_customerId_fkey";
DROP INDEX IF EXISTS "Booking_customerId_idx";
ALTER TABLE "Booking" DROP COLUMN "customerId";
DROP TABLE "Customer";
DROP TABLE "_CustomerUserMap";

CREATE TABLE "LeaveDay" (
  "id" SERIAL NOT NULL, "leaveRequestId" INTEGER NOT NULL, "date" DATE NOT NULL,
  "startTime" TEXT, "endTime" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveDay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveDay_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeaveDay_leaveRequestId_date_idx" ON "LeaveDay"("leaveRequestId", "date");
CREATE INDEX "LeaveDay_date_idx" ON "LeaveDay"("date");
-- Backfill existing date ranges as individual leave days.
INSERT INTO "LeaveDay" ("leaveRequestId", "date")
SELECT lr."id", d::date FROM "LeaveRequest" lr
CROSS JOIN LATERAL generate_series(lr."startDate", lr."endDate", interval '1 day') d;

CREATE TABLE "ApprovalHistory" (
  "id" SERIAL NOT NULL, "requestType" TEXT NOT NULL, "leaveRequestId" INTEGER,
  "shiftSwapRequestId" INTEGER, "actorId" INTEGER NOT NULL, "action" TEXT NOT NULL,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalHistory_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalHistory_shiftSwapRequestId_fkey" FOREIGN KEY ("shiftSwapRequestId") REFERENCES "ShiftSwapRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ApprovalHistory_leaveRequestId_createdAt_idx" ON "ApprovalHistory"("leaveRequestId", "createdAt");
CREATE INDEX "ApprovalHistory_shiftSwapRequestId_createdAt_idx" ON "ApprovalHistory"("shiftSwapRequestId", "createdAt");
CREATE INDEX "ApprovalHistory_actorId_createdAt_idx" ON "ApprovalHistory"("actorId", "createdAt");
-- Preserve decisions made before the audit table existed.
INSERT INTO "ApprovalHistory" ("requestType", "leaveRequestId", "actorId", "action", "note", "createdAt")
SELECT 'LEAVE', lr."id", lr."supervisorById", COALESCE(lr."supervisorDecision", 'SUBMITTED'), lr."supervisorNote", COALESCE(lr."supervisorAt", lr."createdAt")
FROM "LeaveRequest" lr WHERE lr."supervisorById" IS NOT NULL;
INSERT INTO "ApprovalHistory" ("requestType", "leaveRequestId", "actorId", "action", "note", "createdAt")
SELECT 'LEAVE', lr."id", lr."finalById", COALESCE(lr."finalDecision", 'SUBMITTED'), lr."finalNote", COALESCE(lr."finalAt", lr."createdAt")
FROM "LeaveRequest" lr WHERE lr."finalById" IS NOT NULL;
INSERT INTO "ApprovalHistory" ("requestType", "shiftSwapRequestId", "actorId", "action", "note", "createdAt")
SELECT 'SHIFT_SWAP', sr."id", sr."decidedById", COALESCE(sr."status", 'SUBMITTED'), sr."decisionNote", COALESCE(sr."decidedAt", sr."createdAt")
FROM "ShiftSwapRequest" sr WHERE sr."decidedById" IS NOT NULL;

CREATE TABLE "Task" (
  "id" SERIAL NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueDate" DATE,
  "createdById" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Task_createdById_createdAt_idx" ON "Task"("createdById", "createdAt");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

CREATE TABLE "TaskAssignment" (
  "id" SERIAL NOT NULL, "taskId" INTEGER NOT NULL, "userId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "completedAt" TIMESTAMP(3), "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TaskAssignment_taskId_userId_key" ON "TaskAssignment"("taskId", "userId");
CREATE INDEX "TaskAssignment_userId_status_idx" ON "TaskAssignment"("userId", "status");
