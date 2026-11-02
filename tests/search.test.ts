import assert from "node:assert/strict";
import { test } from "node:test";

import { matchesQuery, normalizeSearch } from "@/lib/search";

test("اعداد فارسی و عربی و حروف عربی یکسان می‌شوند", () => {
  assert.equal(normalizeSearch("۰۹۱۲ كيا"), "0912 کیا");
});

test("جست‌وجوی چندکلمه‌ای: همه‌ی کلمه‌ها باید باشند", () => {
  const row = "بازی پینتبال علی رضایی 09123456789 AB12CD پرداخت‌شده";

  assert.ok(matchesQuery(row, ""));
  assert.ok(matchesQuery(row, "علی رضایی"));
  assert.ok(matchesQuery(row, "۰۹۱۲۳۴"));
  assert.ok(matchesQuery(row, "ab12"));
  assert.ok(!matchesQuery(row, "علی احمدی"));
});
