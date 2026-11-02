-- پرسنل: کد دستگاه و سوپروایزر
ALTER TABLE "User"
  ADD COLUMN "deviceCode" TEXT,
  ADD COLUMN "supervisorId" INTEGER;

CREATE UNIQUE INDEX "User_deviceCode_key" ON "User"("deviceCode");
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- مرخصی
CREATE TABLE "LeaveRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SUPERVISOR',
    "supervisorById" INTEGER,
    "supervisorDecision" TEXT,
    "supervisorNote" TEXT,
    "supervisorAt" TIMESTAMP(3),
    "finalById" INTEGER,
    "finalDecision" TEXT,
    "finalNote" TEXT,
    "finalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeaveRequest_dates_chk" CHECK ("endDate" >= "startDate")
);

CREATE INDEX "LeaveRequest_userId_startDate_idx" ON "LeaveRequest"("userId", "startDate");
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_supervisorById_fkey"
  FOREIGN KEY ("supervisorById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_finalById_fkey"
  FOREIGN KEY ("finalById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- شیفت
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Shift_type_chk" CHECK ("type" IN ('FULL', 'AM', 'PM', 'LEAVE'))
);

CREATE UNIQUE INDEX "Shift_userId_date_key" ON "Shift"("userId", "date");
CREATE INDEX "Shift_date_idx" ON "Shift"("date");

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- جابه‌جایی شیفت
CREATE TABLE "ShiftSwapRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "currentType" TEXT NOT NULL,
    "requestedType" TEXT NOT NULL,
    "replacementId" INTEGER,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SUPERVISOR',
    "decidedById" INTEGER,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftSwapRequest_requesterId_date_idx" ON "ShiftSwapRequest"("requesterId", "date");
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");

ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_replacementId_fkey"
  FOREIGN KEY ("replacementId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- دستگاه و تردد
CREATE TABLE "AttendanceDevice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceDevice_keyHash_key" ON "AttendanceDevice"("keyHash");

CREATE TABLE "AttendanceLog" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER,
    "deviceUserCode" TEXT NOT NULL,
    "punchDate" DATE NOT NULL,
    "punchTime" TEXT NOT NULL,
    "direction" TEXT,
    "source" TEXT NOT NULL DEFAULT 'IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceLog_deviceUserCode_punchDate_punchTime_key"
  ON "AttendanceLog"("deviceUserCode", "punchDate", "punchTime");
CREATE INDEX "AttendanceLog_punchDate_idx" ON "AttendanceLog"("punchDate");

ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
