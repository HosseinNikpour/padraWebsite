ALTER TABLE "LeaveDay" ADD COLUMN "type" TEXT;
UPDATE "LeaveDay" AS d SET "type" = r."type" FROM "LeaveRequest" AS r WHERE d."leaveRequestId" = r."id";
