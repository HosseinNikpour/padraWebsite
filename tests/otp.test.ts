import assert from "node:assert/strict";
import { test } from "node:test";

import { generateOtpCode, hashOtp, otpMatches } from "@/lib/otp-core";

test("کد ۶ رقمی با صفر ابتدایی تولید می‌شود", () => {
  for (let i = 0; i < 200; i++) assert.match(generateOtpCode(), /^\d{6}$/);
});

test("hash به شماره و pepper وابسته است", () => {
  const h = hashOtp("09120000000", "123456", "pepper");

  assert.ok(otpMatches("09120000000", "123456", h, "pepper"));
  assert.ok(!otpMatches("09120000000", "123457", h, "pepper"));
  assert.ok(!otpMatches("09121111111", "123456", h, "pepper"));
  assert.ok(!otpMatches("09120000000", "123456", h, "other"));
});
