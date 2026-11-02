import { NextResponse } from "next/server";

import { isValidDate, nowInTehran } from "@/lib/availability";
import { isInSupervisorScope } from "@/lib/leave";
import { isShiftType } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { swapInclude, toSwapDto } from "@/lib/swap-dto";
import { can, dbDate, fail, loadShiftMap, requireStaff, shiftKey } from "@/lib/staff";

/** GET ?scope=mine|approvals|all */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const scope = new URL(request.url).searchParams.get("scope") ?? "mine";

  if (scope === "approvals") {
    if (!can(user, "shifts.swap.approve") && !can(user, "leave.approve.final")) return fail("دسترسی ندارید", 403);

    const rows = await prisma.shiftSwapRequest.findMany({
      where: { status: "PENDING_SUPERVISOR", requesterId: { not: user.id } },
      include: swapInclude,
      orderBy: { date: "asc" },
      take: 200,
    });

    return NextResponse.json(
      rows.filter((r) => can(user, "leave.approve.final") || isInSupervisorScope(user.id, r.requester.supervisorId)).map(toSwapDto),
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (scope === "all" && !can(user, "shifts.view")) return fail("دسترسی ندارید", 403);

  const rows = await prisma.shiftSwapRequest.findMany({
    where: scope === "all" ? {} : { requesterId: user.id },
    include: swapInclude,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 200,
  });

  return NextResponse.json(rows.map(toSwapDto), { headers: { "Cache-Control": "no-store" } });
}

/**
 * ثبت درخواست جابه‌جایی شیفت: تاریخ ← شیفت فعلی خودکار از سیستم ← شیفت جدید + جایگزین
 * POST { date, requestedType, replacementId?, reason? }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    const { user } = auth;
    const body = await request.json();
    const date = body.date;
    const requestedType = body.requestedType;
    const reason = String(body.reason ?? "").trim().slice(0, 500) || null;
    const replacementId = body.replacementId ? Number(body.replacementId) : null;

    if (!isValidDate(date)) return fail("تاریخ معتبر نیست");
    if (date < nowInTehran().date) return fail("جابه‌جایی برای تاریخ گذشته ممکن نیست");
    if (!isShiftType(requestedType) || requestedType === "LEAVE" || requestedType === "ABSENT") return fail("شیفت درخواستی معتبر نیست");

    const map = await loadShiftMap([user.id], date, date);
    const current = map.get(shiftKey(user.id, date)) ?? null;

    if (!current) return fail("برای این روز شیفتی برای شما ثبت نشده است");
    if (current === "LEAVE") return fail("در این روز مرخصی هستید");
    if (current === "ABSENT") return fail("برای این روز غیبت ثبت شده است");
    if (current === requestedType) return fail("شیفت درخواستی با شیفت فعلی یکی است");

    if (replacementId !== null) {
      if (!Number.isInteger(replacementId) || replacementId === user.id) return fail("جایگزین معتبر نیست");

      const replacement = await prisma.user.findFirst({
        where: { id: replacementId, isActive: true, role: { code: { not: "CUSTOMER" } } },
        select: { id: true },
      });

      if (!replacement) return fail("جایگزین پیدا نشد");

      const repMap = await loadShiftMap([replacementId], date, date);

      if (repMap.get(shiftKey(replacementId, date)) === "LEAVE") {
        return fail("جایگزین در این روز مرخصی است");
      }
    }

    const duplicate = await prisma.shiftSwapRequest.findFirst({
      where: { requesterId: user.id, date: dbDate(date), status: "PENDING_SUPERVISOR" },
      select: { id: true },
    });

    if (duplicate) return fail("برای این روز یک درخواست در انتظار تأیید دارید");

    const created = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: user.id,
        date: dbDate(date),
        currentType: current,
        requestedType,
        replacementId,
        reason,
        history: { create: { requestType: "SHIFT_SWAP", actorId: user.id, action: "SUBMITTED", note: reason } },
      },
      include: swapInclude,
    });

    return NextResponse.json(toSwapDto(created), { status: 201 });
  } catch (error) {
    console.error("SWAP CREATE ERROR:", error);

    return fail("خطا در ثبت درخواست", 500);
  }
}
