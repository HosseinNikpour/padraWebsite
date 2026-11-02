import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { generateDeviceKey, hashDeviceKey } from "@/lib/attendance-service";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/staff";

const select = { id: true, name: true, isActive: true, lastSeenAt: true, createdAt: true, _count: { select: { logs: true } } } as const;

const dto = (d: { id: number; name: string; isActive: boolean; lastSeenAt: Date | null; createdAt: Date; _count: { logs: number } }) => ({
  id: d.id, name: d.name, isActive: d.isActive, lastSeenAt: d.lastSeenAt, createdAt: d.createdAt, logCount: d._count.logs,
});

export async function GET() {
  const auth = await authorize("attendance.manage");
  if (!auth.ok) return auth.response;

  const devices = await prisma.attendanceDevice.findMany({ select, orderBy: { id: "asc" } });

  return NextResponse.json(devices.map(dto), { headers: { "Cache-Control": "no-store" } });
}

/** POST { name } → دستگاه جدید؛ کلید فقط همین یک بار نمایش داده می‌شود */
export async function POST(request: Request) {
  const auth = await authorize("attendance.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (name.length < 2 || name.length > 60) return fail("نام دستگاه را وارد کنید");

  const key = generateDeviceKey();
  const device = await prisma.attendanceDevice.create({ data: { name, keyHash: hashDeviceKey(key) }, select });

  return NextResponse.json({ device: dto(device), key }, { status: 201 });
}

/** PATCH { id, isActive? , rotateKey? , name? } */
export async function PATCH(request: Request) {
  const auth = await authorize("attendance.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const id = Number(body.id);

  if (!Number.isInteger(id)) return fail("شناسه نامعتبر است");

  const data: { isActive?: boolean; name?: string; keyHash?: string } = {};
  let key: string | undefined;

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 60);

  if (body.rotateKey) {
    key = generateDeviceKey();
    data.keyHash = hashDeviceKey(key);
  }

  const exists = await prisma.attendanceDevice.findUnique({ where: { id }, select: { id: true } });

  if (!exists) return fail("دستگاه پیدا نشد", 404);

  const device = await prisma.attendanceDevice.update({ where: { id }, data, select });

  return NextResponse.json({ device: dto(device), key });
}

export async function DELETE(request: Request) {
  const auth = await authorize("attendance.manage");
  if (!auth.ok) return auth.response;

  const id = Number((await request.json()).id);

  if (!Number.isInteger(id)) return fail("شناسه نامعتبر است");

  // ترددهای ثبت‌شده حفظ می‌شود (deviceId خالی می‌شود)
  await prisma.attendanceDevice.deleteMany({ where: { id } });

  return NextResponse.json({ success: true });
}
