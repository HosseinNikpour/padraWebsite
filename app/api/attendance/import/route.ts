import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { insertPunches, MAX_IMPORT_CHARS, MAX_IMPORT_RECORDS, findUnmappedCodes, parsePunchText } from "@/lib/attendance-service";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/staff";

/** ورود دستی فایل خروجی دستگاه: POST { text, deviceId? } (متن CSV/TXT) */
export async function POST(request: Request) {
  try {
    const auth = await authorize("attendance.manage");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text : "";
    const deviceId = body.deviceId ? Number(body.deviceId) : null;

    if (!text.trim()) return fail("فایل خالی است");
    if (text.length > MAX_IMPORT_CHARS) return fail("حجم فایل بیش از حد مجاز است");

    if (deviceId !== null) {
      const device = await prisma.attendanceDevice.findUnique({ where: { id: deviceId }, select: { id: true } });

      if (!device) return fail("دستگاه پیدا نشد");
    }

    const { records, errors } = parsePunchText(text);

    if (records.length > MAX_IMPORT_RECORDS) return fail("تعداد ردیف‌ها بیش از حد مجاز است. فایل را تکه‌تکه کنید");

    if (records.length === 0) {
      return NextResponse.json({ parsed: 0, inserted: 0, duplicates: 0, errors: errors.slice(0, 20), errorCount: errors.length, unmapped: [] });
    }

    const result = await insertPunches(records, { deviceId, source: "IMPORT" });

    if (deviceId) await prisma.attendanceDevice.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } });

    return NextResponse.json({
      parsed: records.length,
      ...result,
      errors: errors.slice(0, 20),
      errorCount: errors.length,
      unmapped: await findUnmappedCodes(),
    });
  } catch (error) {
    console.error("ATTENDANCE IMPORT ERROR:", error);

    return fail("خطا در ورود اطلاعات", 500);
  }
}
