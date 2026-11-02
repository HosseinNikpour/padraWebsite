import assert from "node:assert/strict";
import { test } from "node:test";

import { clearRateLimit, getClientIp, rateLimit } from "@/lib/rate-limit";

test("بعد از سقف مجاز، درخواست رد می‌شود و با clear دوباره باز می‌شود", async () => {
  const key = `t:${Math.random()}`;

  for (let i = 0; i < 3; i++) assert.equal((await rateLimit(key, 3, 60_000)).allowed, true);

  const blocked = await rateLimit(key, 3, 60_000);

  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);

  await clearRateLimit(key);
  assert.equal((await rateLimit(key, 3, 60_000)).allowed, true);
});

test("IP از هدر معتبر پلتفرم خوانده می‌شود، نه مقدار جعلیِ اول x-forwarded-for", () => {
  const spoofed = new Request("http://x", { headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4" } });

  assert.equal(getClientIp(spoofed), "1.2.3.4");

  const vercel = new Request("http://x", {
    headers: { "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "6.6.6.6" },
  });

  assert.equal(getClientIp(vercel), "9.9.9.9");
  assert.equal(getClientIp(new Request("http://x")), "unknown");
});
