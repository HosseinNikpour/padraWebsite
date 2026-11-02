import assert from "node:assert/strict";
import { test } from "node:test";

import { parseAssigneeIds, validateTaskUpdate } from "@/lib/tasks";

test("شناسه‌ی انجام‌دهنده‌ها: تکراری و نامعتبر حذف می‌شود", () => {
  assert.deepEqual(parseAssigneeIds([3, "3", 5, -1, 0, "x", 2.5]), [3, 5]);
  assert.equal(parseAssigneeIds("1,2"), null);
});

test("گزارش روزانه: حداقل توضیح یا تغییر وضعیت لازم است", () => {
  assert.equal(validateTaskUpdate({}, "OPEN").ok, false);
  assert.equal(validateTaskUpdate({ note: "   " }, "OPEN").ok, false);
  assert.equal(validateTaskUpdate({ status: "OPEN" }, "OPEN").ok, false);
});

test("گزارش فقط با توضیح، وضعیت فعلی را نگه می‌دارد", () => {
  const r = validateTaskUpdate({ note: " امروز نیمی انجام شد " }, "IN_PROGRESS");

  assert.ok(r.ok && r.status === "IN_PROGRESS" && r.note === "امروز نیمی انجام شد" && !r.statusChanged);
});

test("تغییر وضعیت بدون توضیح پذیرفته می‌شود و وضعیت نامعتبر رد", () => {
  const ok = validateTaskUpdate({ status: "DONE" }, "OPEN");

  assert.ok(ok.ok && ok.status === "DONE" && ok.note === null && ok.statusChanged);
  assert.equal(validateTaskUpdate({ status: "WRONG", note: "x" }, "OPEN").ok, false);
  assert.equal(validateTaskUpdate({ note: "a".repeat(1001) }, "OPEN").ok, false);
});
