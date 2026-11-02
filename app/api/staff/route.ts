import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";

/** فهرست پرسنل فعال (فقط نام) برای انتخاب جایگزین و ... — هر پرسنل واردشده */
export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { code: { not: "CUSTOMER" } } },
    select: { id: true, name: true, supervisorId: true, role: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({ id: u.id, name: u.name, supervisorId: u.supervisorId, role: u.role.name })),
    { headers: { "Cache-Control": "no-store" } }
  );
}
