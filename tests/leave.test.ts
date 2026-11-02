import assert from "node:assert/strict";
import { test } from "node:test";

import { countLeaveDays, decideLeave, initialLeaveStatus } from "@/lib/leave";

const base = {
  decision: "APPROVE" as const,
  actorId: 2,
  requesterId: 1,
  requesterSupervisorId: 2,
  actorCanSupervise: true,
  actorCanFinal: false,
};

test("تأیید مرحله‌ی اول به مدیر می‌رود", () => {
  const r = decideLeave({ ...base, status: "PENDING_SUPERVISOR" });

  assert.ok(r.ok && r.patch.status === "PENDING_MANAGER");
});

test("تأیید یا رد درخواست خود ممنوع است", () => {
  assert.equal(decideLeave({ ...base, status: "PENDING_SUPERVISOR", actorId: 1 }).ok, false);
});

test("سوپروایزر غیرمسئول نمی‌تواند تأیید کند", () => {
  assert.equal(decideLeave({ ...base, status: "PENDING_SUPERVISOR", actorId: 9 }).ok, false);
  assert.equal(decideLeave({ ...base, status: "PENDING_SUPERVISOR", actorCanSupervise: false }).ok, false);
});

test("تأیید نهایی فقط با دسترسی مدیر", () => {
  assert.equal(decideLeave({ ...base, status: "PENDING_MANAGER" }).ok, false);

  const r = decideLeave({ ...base, status: "PENDING_MANAGER", actorCanFinal: true });

  assert.ok(r.ok && r.patch.status === "APPROVED");
});

test("وضعیت نهایی دوباره قابل تصمیم‌گیری نیست", () => {
  assert.equal(decideLeave({ ...base, status: "APPROVED", actorCanFinal: true }).ok, false);
});

test("شمارش روز و وضعیت اولیه", () => {
  assert.equal(countLeaveDays("2026-10-01", "2026-10-03"), 3);
  assert.equal(initialLeaveStatus(true), "PENDING_MANAGER");
  assert.equal(initialLeaveStatus(false), "PENDING_SUPERVISOR");
});
