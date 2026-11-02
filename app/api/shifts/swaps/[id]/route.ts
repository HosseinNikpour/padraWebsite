import { NextResponse } from "next/server";

import { isInSupervisorScope } from "@/lib/leave";
import { mergeShifts, type ShiftType } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { can, fail, loadShiftMap, requireStaff, shiftKey, dateStr } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

class SwapError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

/** PATCH { action: "approve" | "reject" | "cancel", note? } */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) return auth.response;

    const { user } = auth;
    const id = Number((await params).id);
    const body = await request.json();
    const action = String(body.action ?? "");
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

    if (!Number.isInteger(id) || !["approve", "reject", "cancel"].includes(action)) {
      return fail("درخواست نامعتبر است");
    }

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { requester: { select: { id: true, supervisorId: true } } },
    });

    if (!swap) return fail("درخواست پیدا نشد", 404);
    if (swap.status !== "PENDING_SUPERVISOR") return fail("این درخواست دیگر قابل تغییر نیست", 409);

    if (action === "cancel") {
      if (swap.requesterId !== user.id) return fail("فقط درخواست‌دهنده می‌تواند لغو کند", 403);

      await prisma.shiftSwapRequest.update({ where: { id }, data: { status: "CANCELLED" } });
      await prisma.approvalHistory.create({ data: { requestType: "SHIFT_SWAP", shiftSwapRequestId: id, actorId: user.id, action: "CANCELLED", note } });
      return NextResponse.json({ success: true });
    }

    const isManager = can(user, "leave.approve.final");
    if (!can(user, "shifts.swap.approve") && !isManager) return fail("دسترسی ندارید", 403);
    if (swap.requesterId === user.id) return fail("تأیید یا رد درخواست خودتان مجاز نیست", 403);
    if (!isManager && !isInSupervisorScope(user.id, swap.requester.supervisorId)) return fail("این فرد زیرمجموعه‌ی شما نیست", 403);

    if (action === "reject") {
      const r = await prisma.shiftSwapRequest.updateMany({
        where: { id, status: "PENDING_SUPERVISOR" },
        data: { status: "REJECTED", decidedById: user.id, decisionNote: note, decidedAt: new Date() },
      });

      if (r.count === 0) return fail("وضعیت درخواست تغییر کرده است", 409);
      await prisma.approvalHistory.create({ data: { requestType: "SHIFT_SWAP", shiftSwapRequestId: id, actorId: user.id, action: "REJECTED", note } });
      return NextResponse.json({ success: true });
    }

    const date = dateStr(swap.date);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.shiftSwapRequest.updateMany({
        where: { id, status: "PENDING_SUPERVISOR" },
        data: { status: "APPROVED", decidedById: user.id, decisionNote: note, decidedAt: new Date() },
      });

      if (claimed.count === 0) throw new SwapError("وضعیت درخواست تغییر کرده است");
      await tx.approvalHistory.create({ data: { requestType: "SHIFT_SWAP", shiftSwapRequestId: id, actorId: user.id, action: "APPROVED", note } });

      // شیفت فرد باید هنوز همان چیزی باشد که درخواست روی آن ثبت شده
      const map = await loadShiftMap([swap.requesterId], date, date);

      if (map.get(shiftKey(swap.requesterId, date)) !== swap.currentType) {
        throw new SwapError("شیفت این فرد بعد از ثبت درخواست تغییر کرده است. درخواست را رد کنید");
      }

      await tx.shift.upsert({
        where: { userId_date: { userId: swap.requesterId, date: swap.date } },
        update: { type: swap.requestedType },
        create: { userId: swap.requesterId, date: swap.date, type: swap.requestedType },
      });

      // جایگزین، شیفتی را که فرد واگذار کرده به شیفت خودش اضافه می‌کند (صبح + عصر = Full)
      if (swap.replacementId) {
        const repMap = await loadShiftMap([swap.replacementId], date, date);

        if (repMap.get(shiftKey(swap.replacementId, date)) === "LEAVE") {
          throw new SwapError("جایگزین در این روز مرخصی است");
        }

        const row = await tx.shift.findUnique({
          where: { userId_date: { userId: swap.replacementId, date: swap.date } },
        });

        const merged = mergeShifts(row?.type as ShiftType | undefined, swap.currentType as Exclude<ShiftType, "LEAVE">);

        if (merged === "CONFLICT") throw new SwapError("شیفت جایگزین با این جابه‌جایی تداخل دارد");

        await tx.shift.upsert({
          where: { userId_date: { userId: swap.replacementId, date: swap.date } },
          update: { type: merged },
          create: { userId: swap.replacementId, date: swap.date, type: merged },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SwapError) return fail(error.message, error.status);

    console.error("SWAP DECIDE ERROR:", error);

    return fail("خطا در ثبت تصمیم", 500);
  }
}
