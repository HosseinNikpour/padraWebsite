/**
 * Rate limiter.
 *
 * - اگر UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN تنظیم شده باشند، شمارنده‌ها در Redis
 *   نگه داشته می‌شوند و بین همه‌ی instanceهای serverless مشترک‌اند (توصیه‌شده برای production).
 * - در غیر این صورت (توسعه‌ی محلی) از حافظه‌ی همان پردازش استفاده می‌شود.
 * - اگر Redis در دسترس نباشد، به حافظه برمی‌گردد تا سایت از کار نیفتد (fail-open به محافظت ضعیف‌تر).
 */
type Entry = { count: number; resetAt: number };
type Result = { allowed: boolean; retryAfter: number };

const memory = new Map<string, Entry>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();

  if (memory.size > 5000) {
    for (const [k, v] of memory) {
      if (v.resetAt <= now) memory.delete(k);
    }
  }

  const entry = memory.get(key);

  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { url, token } : null;
}

async function redisPipeline(commands: (string | number)[][]) {
  const cfg = redisConfig();

  if (!cfg) throw new Error("redis not configured");

  const response = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`redis ${response.status}`);

  return (await response.json()) as { result?: unknown; error?: string }[];
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Result> {
  if (!redisConfig()) return memoryLimit(key, limit, windowMs);

  try {
    const redisKey = `rl:${key}`;
    // INCR سپس تنظیم انقضا فقط برای اولین درخواست پنجره (NX)، و خواندن TTL باقی‌مانده
    const [incr, , ttl] = await redisPipeline([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, windowMs, "NX"],
      ["PTTL", redisKey],
    ]);
    const count = Number(incr?.result ?? 1);
    const ttlMs = Number(ttl?.result ?? windowMs);

    if (count > limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)) };
    }

    return { allowed: true, retryAfter: 0 };
  } catch (error) {
    console.error("RATE LIMIT REDIS ERROR (falling back to memory):", error);

    return memoryLimit(key, limit, windowMs);
  }
}

export async function clearRateLimit(key: string) {
  memory.delete(key);

  if (!redisConfig()) return;

  try {
    await redisPipeline([["DEL", `rl:${key}`]]);
  } catch (error) {
    console.error("RATE LIMIT CLEAR ERROR:", error);
  }
}

/**
 * IP درخواست‌دهنده. x-forwarded-for توسط کلاینت قابل جعل است، پس فقط هدرهایی که
 * پلتفرم خودش تنظیم می‌کند در اولویت‌اند:
 *   1) x-vercel-forwarded-for (Vercel)    2) cf-connecting-ip (Cloudflare)
 *   3) x-real-ip                          4) آخرین مقدار x-forwarded-for (اضافه‌شده توسط نزدیک‌ترین پروکسی)
 * اگر پشت پروکسی معتبر نیستید (توسعه‌ی محلی) مقدار "unknown" برمی‌گردد.
 */
export function getClientIp(request: Request) {
  const h = request.headers;
  const direct = h.get("x-vercel-forwarded-for") || h.get("cf-connecting-ip") || h.get("x-real-ip");

  if (direct) return direct.split(",")[0].trim();

  const forwarded = h.get("x-forwarded-for");

  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);

    return parts[parts.length - 1] || "unknown";
  }

  return "unknown";
}
