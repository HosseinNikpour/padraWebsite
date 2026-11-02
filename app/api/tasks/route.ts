import { NextResponse } from "next/server";

import { isValidDate, normalizeDigits } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { canAssignTasks, dbDate, fail, isTaskManager, requireStaff } from "@/lib/staff";
import { parseAssigneeIds } from "@/lib/tasks";

const NO_STORE = { "Cache-Control": "no-store" };

/** آخرین گزارش‌های هر انتساب (جدیدترین اول) همراه با نویسنده */
const updatesInclude = {
  orderBy: { createdAt: "desc" },
  take: 30,
  include: { user: { select: { name: true } } },
} as const;

/**
 * GET /api/tasks?scope=
 *   mine (پیش‌فرض)  تسک‌های محول‌شده به من + سابقه‌ی گزارش‌های من
 *   manage          برای مدیر: همه‌ی تسک‌ها؛ برای سوپروایزر: تسک‌هایی که خودش ساخته
 *   assignees       فهرست پرسنل فعال برای انتخاب انجام‌دهنده (فقط مدیر/سوپروایزر)
 */
export async function GET(request: Request) {
  const auth = await requireStaff();

  if (!auth.ok) return auth.response;

  const user = auth.user;
  const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
  const canCreate = canAssignTasks(user);

  if (scope === "assignees") {
    if (!canCreate) return fail("دسترسی ندارید", 403);

    const users = await prisma.user.findMany({
      where: { isActive: true, role: { code: { not: "CUSTOMER" }, isActive: true } },
      select: { id: true, name: true, role: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users, { headers: NO_STORE });
  }

  if (scope === "manage") {
    if (!canCreate) return fail("دسترسی ندارید", 403);

    const tasks = await prisma.task.findMany({
      where: { isActive: true, ...(isTaskManager(user) ? {} : { createdById: user.id }) },
      include: {
        createdBy: { select: { name: true } },
        assignments: {
          orderBy: { id: "asc" },
          include: { user: { select: { id: true, name: true } }, updates: updatesInclude },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(tasks, { headers: NO_STORE });
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { userId: user.id, task: { isActive: true } },
    include: { task: { include: { createdBy: { select: { name: true } } } }, updates: updatesInclude },
    orderBy: [{ status: "asc" }, { task: { dueDate: "asc" } }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ assignments, canCreate }, { headers: NO_STORE });
}

/** POST /api/tasks  { title, description?, dueDate?, assigneeIds: number[] | all: true } */
export async function POST(request: Request) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) return auth.response;
    if (!canAssignTasks(auth.user)) return fail("فقط سوپروایزر یا مدیر مجموعه می‌تواند تسک ایجاد کند", 403);

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") return fail("اطلاعات نامعتبر است");

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim().slice(0, 2000) || null;
    const dueDate = body.dueDate ? normalizeDigits(String(body.dueDate)).trim() : null;

    if (title.length < 2 || title.length > 120) return fail("عنوان تسک باید بین ۲ تا ۱۲۰ کاراکتر باشد");
    if (dueDate && !isValidDate(dueDate)) return fail("تاریخ سررسید معتبر نیست");

    const requested = body.all === true ? null : parseAssigneeIds(body.assigneeIds);

    if (body.all !== true && (!requested || requested.length === 0)) {
      return fail("حداقل یک نفر را برای انجام تسک انتخاب کنید");
    }

    // فقط پرسنل فعال (نه مشتری)؛ شناسه‌های نامعتبر نادیده گرفته می‌شوند
    const assignees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { code: { not: "CUSTOMER" }, isActive: true },
        ...(requested ? { id: { in: requested } } : {}),
      },
      select: { id: true },
    });

    if (!assignees.length) return fail("پرسنل فعالی برای تخصیص تسک پیدا نشد");

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? dbDate(dueDate) : null,
        createdById: auth.user.id,
        assignments: { create: assignees.map((u) => ({ userId: u.id })) },
      },
      include: { assignments: true },
    });

    return NextResponse.json({ id: task.id, assignedCount: task.assignments.length }, { status: 201 });
  } catch (error) {
    console.error("TASK CREATE ERROR", error);

    return fail("خطا در ایجاد تسک", 500);
  }
}

/** DELETE /api/tasks?taskId=  — بایگانی تسک (سازنده یا مدیر). سابقه حذف نمی‌شود. */
export async function DELETE(request: Request) {
  const auth = await requireStaff();

  if (!auth.ok) return auth.response;

  const taskId = Number(new URL(request.url).searchParams.get("taskId"));

  if (!Number.isInteger(taskId)) return fail("شناسه‌ی تسک نامعتبر است");

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { createdById: true, isActive: true } });

  if (!task || !task.isActive) return fail("تسک پیدا نشد", 404);
  if (task.createdById !== auth.user.id && !isTaskManager(auth.user)) return fail("دسترسی ندارید", 403);

  await prisma.task.update({ where: { id: taskId }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
