import { createHash, randomBytes } from "node:crypto";

import { parsePunchText, type ParsedPunch } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const hashDeviceKey = (key: string) => createHash("sha256").update(key).digest("hex");

export const generateDeviceKey = () => `padra_${randomBytes(24).toString("hex")}`;

export const MAX_IMPORT_CHARS = 3_000_000;
export const MAX_IMPORT_RECORDS = 60_000;

/** ثبت تردد؛ تکراری‌ها (همان کد + تاریخ + ساعت) نادیده گرفته می‌شوند و ورودی مجدد فایل بی‌خطر است. */
export async function insertPunches(
  records: ParsedPunch[],
  options: { deviceId: number | null; source: "DEVICE" | "IMPORT" }
) {
  let inserted = 0;

  for (let i = 0; i < records.length; i += 2000) {
    const chunk = records.slice(i, i + 2000);

    const result = await prisma.attendanceLog.createMany({
      data: chunk.map((r) => ({
        deviceId: options.deviceId,
        deviceUserCode: r.code,
        punchDate: new Date(`${r.date}T00:00:00Z`),
        punchTime: r.time,
        direction: r.direction,
        source: options.source,
      })),
      skipDuplicates: true,
    });

    inserted += result.count;
  }

  return { inserted, duplicates: records.length - inserted };
}

/** کدهایی که در ترددها هست ولی به هیچ پرسنلی نسبت داده نشده */
export async function findUnmappedCodes() {
  const [groups, users] = await Promise.all([
    prisma.attendanceLog.groupBy({
      by: ["deviceUserCode"],
      _count: { _all: true },
      _max: { punchDate: true },
    }),
    prisma.user.findMany({ where: { deviceCode: { not: null } }, select: { deviceCode: true } }),
  ]);

  const known = new Set(users.map((u) => u.deviceCode));

  return groups
    .filter((g) => !known.has(g.deviceUserCode))
    .map((g) => ({
      code: g.deviceUserCode,
      count: g._count._all,
      lastDate: g._max.punchDate ? g._max.punchDate.toISOString().slice(0, 10) : null,
    }))
    .sort((a, b) => b.count - a.count);
}

export { parsePunchText };
