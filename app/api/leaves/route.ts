import { NextResponse } from "next/server";

import { isValidDate, nowInTehran } from "@/lib/availability";
import { initialLeaveStatus, isInSupervisorScope, LEAVE_TYPES, MAX_LEAVE_DAYS } from "@/lib/leave";
import { leaveInclude as include, toLeaveDto } from "@/lib/leave-dto";
import { prisma } from "@/lib/prisma";
import { can, dateStr, dbDate, fail, requireStaff } from "@/lib/staff";

/**
 * GET /api/leaves?scope=mine|approvals|all[&filter=taken|upcoming|pending][&userId=&from=&to=]
 *  mine      : مرخصی‌های خودم
 *  approvals : درخواست‌هایی که نوبت تصمیم من است (سوپروایزر / مدیر)
 *  all       : همه‌ی مرخصی‌ها (نیازمند leave.viewAll)
 * filter=taken : مرخصی‌های تأییدشده‌ای که تمام شده‌اند («رفته شده»)
 */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const sp = new URL(request.url).searchParams;
  const scope = sp.get("scope") ?? "mine";
  const filter = sp.get("filter");
  const today = nowInTehran().date;
  const canSupervise = can(user, "leave.approve.supervisor");
  const canFinal = can(user, "leave.approve.final");

  if (scope === "approvals") {
    if (!canSupervise && !canFinal) return fail("دسترسی ندارید", 403);

    const rows = await prisma.leaveRequest.findMany({
      where: {
        userId: { not: user.id },
        OR: [
          ...(canSupervise ? [{ status: "PENDING_SUPERVISOR" }] : []),
          ...(canFinal ? [{ status: "PENDING_MANAGER" }] : []),
        ],
      },
      include,
      orderBy: { startDate: "asc" },
      take: 200,
    });

    const visible = rows.filter(
      (r) => r.status === "PENDING_MANAGER" || isInSupervisorScope(user.id, r.user.supervisorId)
    );

    return NextResponse.json(visible.map(toLeaveDto), { headers: { "Cache-Control": "no-store" } });
  }

  const where: Record<string, unknown> = {};

  if (scope === "all") {
    if (!can(user, "leave.viewAll")) return fail("دسترسی ندارید", 403);

    const userId = Number(sp.get("userId"));

    if (Number.isInteger(userId) && userId > 0) where.userId = userId;
  } else {
    where.userId = user.id;
  }

  const from = sp.get("from");
  const to = sp.get("to");

  if (isValidDate(from)) where.endDate = { gte: dbDate(from) };
  if (isValidDate(to)) where.startDate = { lte: dbDate(to) };

  if (filter === "taken") {
    where.status = "APPROVED";
    where.endDate = { ...(where.endDate as object), lt: dbDate(today) };
  } else if (filter === "upcoming") {
    where.status = "APPROVED";
    where.endDate = { ...(where.endDate as object), gte: dbDate(today) };
  } else if (filter === "pending") {
    where.status = { in: ["PENDING_SUPERVISOR", "PENDING_MANAGER"] };
  }

  const rows = await prisma.leaveRequest.findMany({
    where,
    include,
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    take: 300,
  });

  return NextResponse.json(rows.map(toLeaveDto), { headers: { "Cache-Control": "no-store" } });
}

/** ثبت درخواست مرخصی توسط خود پرسنل */
export async function POST(request: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    const { user } = auth;
    const body = await request.json();
    const fallbackType = String(body.type ?? "DAILY");
    const reason = String(body.reason ?? "").trim().slice(0, 500) || null;
    if (!(fallbackType in LEAVE_TYPES) && fallbackType !== "MIXED") return fail("نوع مرخصی معتبر نیست");

    const submittedEntries = Array.isArray(body.entries) ? body.entries : null;
    const entries: { date: string; type: string; startTime: string | null; endTime: string | null }[] = submittedEntries
      ? submittedEntries.map((item: { date?: unknown; type?: unknown; startTime?: unknown; endTime?: unknown }) => ({
          date: String(item.date ?? ""),
          type: String(item.type ?? fallbackType),
          startTime: item.startTime ? String(item.startTime) : null,
          endTime: item.endTime ? String(item.endTime) : null,
        }))
      : [{ date: String(body.startDate ?? ""), type: fallbackType, startTime: null, endTime: null }, { date: String(body.endDate ?? body.startDate ?? ""), type: fallbackType, startTime: null, endTime: null }].filter((v, i, a) => i === 0 || v.date !== a[0].date);

    if (!entries.length || entries.length > MAX_LEAVE_DAYS) return fail(`تعداد ردیف‌ها باید بین ۱ تا ${MAX_LEAVE_DAYS} باشد`);
    if (entries.some((e) => !(e.type in LEAVE_TYPES))) return fail("نوع مرخصی یکی از ردیف‌ها معتبر نیست");
    if (entries.some((e) => !isValidDate(e.date) || e.date < nowInTehran().date)) return fail("تاریخ‌ها معتبر نیستند یا در گذشته قرار دارند");
    if (new Set(entries.map((e) => e.date)).size !== entries.length) return fail("تاریخ تکراری در ردیف‌ها وجود دارد");
    if (entries.some((e) => e.type === "HOURLY" && (!e.startTime || !e.endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.endTime) || e.endTime <= e.startTime))) return fail("برای هر ردیف مرخصی ساعتی، ساعت شروع و پایان معتبر وارد کنید");
    if (entries.some((e) => e.type !== "HOURLY" && (e.startTime || e.endTime))) return fail("ساعت فقط برای ردیف مرخصی ساعتی قابل ثبت است");
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const startDate = entries[0].date;
    const endDate = entries[entries.length - 1].date;
    const distinctTypes = [...new Set(entries.map((e) => e.type))];
    const type = distinctTypes.length === 1 ? distinctTypes[0] : "MIXED";
    const days = entries.filter((e) => e.type !== "HOURLY").length;

    const overlap = await prisma.leaveRequest.findFirst({
      where: { userId: user.id, status: { in: ["PENDING_SUPERVISOR", "PENDING_MANAGER", "APPROVED"] },
        OR: entries.map((e) => ({ startDate: { lte: dbDate(e.date) }, endDate: { gte: dbDate(e.date) } })) },
      select: { id: true },
    });
    if (overlap) return fail("در بازه انتخاب‌شده قبلاً درخواست مرخصی ثبت کرده‌اید");

    const isSupervisor = can(user, "leave.approve.supervisor");

    const created = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        type,
        startDate: dbDate(startDate),
        endDate: dbDate(endDate),
        days,
        reason,
        status: initialLeaveStatus(isSupervisor),
        // سوپروایزر مرحله‌ی تأیید سوپروایزر ندارد
        ...(isSupervisor ? { supervisorDecision: "SKIPPED", supervisorAt: new Date() } : {}),
        entries: { create: entries.map((e) => ({ date: dbDate(e.date), type: e.type, startTime: e.startTime, endTime: e.endTime })) },
        history: { create: { requestType: "LEAVE", actorId: user.id, action: "SUBMITTED", note: reason } },
      },
      include,
    });
    return NextResponse.json(toLeaveDto(created), { status: 201 });
  } catch (error) {
    console.error("LEAVE CREATE ERROR:", error);

    return fail("خطا در ثبت درخواست", 500);
  }
}
