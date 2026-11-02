import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fail, requireStaff } from "@/lib/staff";
import { isTaskStatus, validateTaskUpdate } from "@/lib/tasks";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tasks/:assignmentId  { note?, status? }
 * گزارش روزانه‌ی انجام‌دهنده: هر بار یک ردیف در سابقه (TaskUpdate) با تاریخ ثبت می‌شود و
 * وضعیت/آخرین توضیح انتساب به‌روز می‌شود. فقط خودِ انجام‌دهنده می‌تواند گزارش بدهد.
 */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaff();

  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  const body = await request.json().catch(() => null);

  if (!Number.isInteger(id) || !body || typeof body !== "object") return fail("اطلاعات نامعتبر است");

  const existing = await prisma.taskAssignment.findFirst({
    where: { id, userId: auth.user.id, task: { isActive: true } },
    select: { status: true },
  });

  if (!existing) return fail("تسک پیدا نشد یا متعلق به شما نیست", 404);

  const current = isTaskStatus(existing.status) ? existing.status : "OPEN";
  const result = validateTaskUpdate({ status: body.status, note: body.note }, current);

  if (!result.ok) return fail(result.error);

  // اول گزارش ثبت می‌شود تا در پاسخ (سابقه‌ی به‌روز) دیده شود
  const [, assignment] = await prisma.$transaction([
    prisma.taskUpdate.create({
      data: { assignmentId: id, userId: auth.user.id, status: result.status, note: result.note },
    }),
    prisma.taskAssignment.update({
      where: { id },
      data: {
        status: result.status,
        ...(result.note ? { note: result.note } : {}),
        completedAt: result.status === "DONE" ? new Date() : null,
      },
      include: {
        updates: { orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return NextResponse.json({ success: true, assignment });
}
