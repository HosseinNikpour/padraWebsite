import assert from "node:assert/strict";
import { test } from "node:test";

import { addDays, isValidDate, nowInTehran, timeToMinutes, weekdayOf } from "@/lib/availability";
import { diffDays, toGregorian, toJalali } from "@/lib/jalali";
import { isValidPhone, normalizePhone } from "@/lib/phone";

test("تبدیل شمسی ⇄ میلادی رفت‌وبرگشتی است", () => {
  assert.deepEqual(toJalali("2026-03-21"), { jy: 1405, jm: 1, jd: 1 });
  for (const d of ["2024-02-29", "2026-10-25", "2027-03-20", "2030-12-31"]) {
    const j = toJalali(d);

    assert.equal(toGregorian(j.jy, j.jm, j.jd), d);
  }
});

test("محاسبه‌ی روز", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(diffDays("2026-10-25", "2026-10-20"), 5);
  assert.equal(weekdayOf("2026-10-25"), 0); // یکشنبه
  assert.ok(isValidDate("2026-10-25"));
  assert.ok(!isValidDate("2026-13-40"));
  assert.equal(timeToMinutes("10:30"), 630);
});

test("نیمه‌شب تهران: UTC 20:30 روز قبل = 00:00 تهران (+03:30)", () => {
  const t = nowInTehran(new Date("2026-10-24T20:45:00Z"));

  assert.equal(t.date, "2026-10-25");
  assert.ok(t.minutes >= 0 && t.minutes < 60);
});

test("نرمال‌سازی شماره موبایل", () => {
  for (const raw of ["09123456789", "+989123456789", "00989123456789", "9123456789", "۰۹۱۲۳۴۵۶۷۸۹", "0912 345-6789"]) {
    assert.equal(normalizePhone(raw), "09123456789");
  }

  assert.ok(!isValidPhone("0212345678"));
});

test("parsePhone: یک نقطه‌ی واحد برای نرمال‌سازی و اعتبارسنجی", async () => {
  const { parsePhone, PHONE_ERROR } = await import("@/lib/phone");

  assert.equal(parsePhone("+98 912 345 6789"), "09123456789");
  assert.equal(parsePhone("۰۹۱۲-۳۴۵-۶۷۸۹"), "09123456789");
  assert.equal(parsePhone("0912345678"), null);
  assert.equal(parsePhone(""), null);
  assert.equal(parsePhone(undefined), null);
  assert.match(PHONE_ERROR, /09123456789/);
});

test("تاریخ با ارقام فارسی بعد از normalizeDigits معتبر می‌شود (باگ تقویم شمسی)", async () => {
  const { normalizeDigits } = await import("@/lib/availability");

  assert.ok(!isValidDate("۲۰۲۶-۱۱-۰۵"));
  assert.ok(isValidDate(normalizeDigits("۲۰۲۶-۱۱-۰۵")));
});
