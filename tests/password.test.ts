import assert from "node:assert/strict";
import { test } from "node:test";

import { validatePassword } from "@/lib/password";

test("رمز کوتاه یا بلند رد می‌شود", () => {
  assert.ok(validatePassword("abc12"));
  assert.ok(validatePassword("a".repeat(101)));
});

test("رمزهای رایج و تکراری رد می‌شوند", () => {
  assert.ok(validatePassword("12345678"));
  assert.ok(validatePassword("Password123"));
  assert.ok(validatePassword("aaaaaaaaaa"));
});

test("رمز مشابه نام کاربری یا موبایل رد می‌شود", () => {
  assert.ok(validatePassword("MyUserName", { username: "myusername" }));
  assert.ok(validatePassword("09123456789", { phone: "09123456789" }));
});

test("رمز مناسب پذیرفته می‌شود", () => {
  assert.equal(validatePassword("k7#Vq2!mZp9x", { username: "ali" }), null);
});
