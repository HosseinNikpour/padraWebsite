import { NextResponse } from "next/server";

import { decideLeave } from "@/lib/leave";
import { prisma } from "@/lib/prisma";
import { can, fail, requireStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

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

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, supervisorId: true } } },
    });

    if (!leave) return fail("درخواست پیدا نشد", 404);

    const pending = leave.status === "PENDING_SUPERVISOR" || leave.status === "PENDING_MANAGER";

    if (action === "cancel") {
      const own = leave.userId === user.id && pending;
      const manager = can(user, "leave.approve.final") && (pending || leave.status === "APPROVED");

      if (!own && !manager) return fail("امکان لغو این درخواست وجود ندارد", 403);

      await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
      await prisma.approvalHistory.create({ data: { requestType: "LEAVE", leaveRequestId: id, actorId: user.id, action: "CANCELLED", note } });
      return NextResponse.json({ success: true });
    }

    const decision = decideLeave({
      status: leave.status,
      decision: action === "approve" ? "APPROVE" : "REJECT",
      actorId: user.id,
      requesterId: leave.userId,
      requesterSupervisorId: leave.user.supervisorId,
      actorCanSupervise: can(user, "leave.approve.supervisor"),
      actorCanFinal: can(user, "leave.approve.final"),
      note,
    });

    if (!decision.ok) return fail(decision.error, 403);

    // فقط اگر هنوز در همان وضعیت است (جلوگیری از تصمیم دوباره / هم‌زمان)
    const result = await prisma.leaveRequest.updateMany({
      where: { id, status: leave.status },
      data: decision.patch,
    });

    if (result.count === 0) return fail("وضعیت این درخواست تغییر کرده است. صفحه را تازه کنید", 409);
    await prisma.approvalHistory.create({ data: { requestType: "LEAVE", leaveRequestId: id, actorId: user.id, action: action === "approve" ? "APPROVED" : "REJECTED", note } });
    return NextResponse.json({ success: true, status: decision.patch.status });
  } catch (error) {
    console.error("LEAVE DECIDE ERROR:", error);

    return fail("خطا در ثبت تصمیم", 500);
  }
}
