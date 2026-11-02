import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveRedirect } from "@/lib/redirect";

test("پرسنل به مسیر درخواستی برمی‌گردند و پیش‌فرضشان /admin است", () => {
  assert.equal(resolveRedirect("staff", "/admin/users"), "/admin/users");
  assert.equal(resolveRedirect("staff", "/profile"), "/profile");
  assert.equal(resolveRedirect("staff", "/booking?eventId=3"), "/booking?eventId=3");
  assert.equal(resolveRedirect("staff", "/account?next=/admin"), "/admin");
  assert.equal(resolveRedirect("staff", null), "/admin");
});

test("مشتری هرگز به /admin هدایت نمی‌شود", () => {
  assert.equal(resolveRedirect("customer", "/admin"), "/profile");
  assert.equal(resolveRedirect("customer", "/admin/users"), "/profile");
  assert.equal(resolveRedirect("customer", "/booking?type=game"), "/booking?type=game");
});

test("open redirect بسته است", () => {
  for (const evil of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"]) {
    assert.equal(resolveRedirect("customer", evil), "/profile");
    assert.equal(resolveRedirect("staff", evil), "/admin");
  }
});
