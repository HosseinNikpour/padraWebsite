import { NextResponse } from "next/server";

import { hashDeviceKey, insertPunches, parsePunchText } from "@/lib/attendance-service";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { fail } from "@/lib/staff";

/**
 * ارسال خودکار تردد از دستگاه/برنامه‌ی واسط.
 *   POST /api/attendance/punch      هدر: x-device-key: <کلید دستگاه>
 *   body: { "records": [ { "code": "12", "datetime": "2026-10-21 10:03:12", "direction": "IN" } ] }
 *     یا: { "text": "12,2026-10-21 10:03:12\n..." }
 */
export async function POST(request: Request) {
  try {
    const key = request.headers.get("x-device-key") ?? "";

    if (!key) return fail("کلید دستگاه ارسال نشده است", 401);

    const limit = await rateLimit(`punch:${getClientIp(request)}`, 120, 60 * 1000);

    if (!limit.allowed) return fail("تعداد درخواست‌ها زیاد است", 429);

    const device = await prisma.attendanceDevice.findUnique({ where: { keyHash: hashDeviceKey(key) } });

    if (!device || !device.isActive) return fail("کلید دستگاه نامعتبر است", 401);

    const body = await request.json();

    const text: string =
      typeof body.text === "string"
        ? body.text
        : Array.isArray(body.records)
          ? body.records
              .slice(0, 5000)
              .map((r: { code?: unknown; datetime?: unknown; direction?: unknown }) =>
                [String(r.code ?? ""), String(r.datetime ?? ""), r.direction ? String(r.direction) : ""].join(",")
              )
              .join("\n")
          : "";

    const { records, errors } = parsePunchText(text);
    const result = records.length ? await insertPunches(records, { deviceId: device.id, source: "DEVICE" }) : { inserted: 0, duplicates: 0 };

    await prisma.attendanceDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });

    return NextResponse.json({ parsed: records.length, ...result, errorCount: errors.length });
  } catch (error) {
    console.error("ATTENDANCE PUNCH ERROR:", error);

    return fail("خطا در ثبت تردد", 500);
  }
}
