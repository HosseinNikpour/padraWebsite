import { diffDays } from "@/lib/jalali";

export const LEAVE_TYPES: Record<string, string> = {
  DAILY: "روزانه",
  HOURLY: "ساعتی",
  ANNUAL: "استحقاقی",
  SICK: "استعلاجی",
  UNPAID: "بدون حقوق",
  OTHER: "سایر",
};

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING_SUPERVISOR: "در انتظار تأیید سوپروایزر",
  PENDING_MANAGER: "در انتظار تأیید نهایی مدیر",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  CANCELLED: "لغو شده",
};

export const MAX_LEAVE_DAYS = 60;

/** تعداد روزهای مرخصی (شامل روز اول و آخر) */
export function countLeaveDays(start: string, end: string) {
  return diffDays(end, start) + 1;
}

/** درخواست سوپروایزر مرحله‌ی تأیید سوپروایزر را ندارد و مستقیم نزد مدیر می‌رود. */
export function initialLeaveStatus(requesterIsSupervisor: boolean) {
  return requesterIsSupervisor ? "PENDING_MANAGER" : "PENDING_SUPERVISOR";
}

export type LeaveDecisionInput = {
  status: string;
  decision: "APPROVE" | "REJECT";
  actorId: number;
  requesterId: number;
  requesterSupervisorId: number | null;
  actorCanSupervise: boolean;
  actorCanFinal: boolean;
  /** مدیر سیستم/مدیرانی که تأیید نهایی دارند، مرحله‌ی اول را هم می‌توانند ببینند */
  note?: string | null;
};

export type LeavePatch = {
  status: string;
  supervisorDecision?: string;
  supervisorNote?: string | null;
  supervisorById?: number;
  supervisorAt?: Date;
  finalDecision?: string;
  finalNote?: string | null;
  finalById?: number;
  finalAt?: Date;
};

/** سوپروایزرِ مجاز: سوپروایزر مستقیم فرد، یا هر سوپروایزر وقتی فرد سوپروایزر مستقیم ندارد */
export function isInSupervisorScope(
  actorId: number,
  requesterSupervisorId: number | null
) {
  return requesterSupervisorId === null || requesterSupervisorId === actorId;
}

export function decideLeave(
  input: LeaveDecisionInput,
  now: Date = new Date()
): { ok: true; patch: LeavePatch } | { ok: false; error: string } {
  if (input.actorId === input.requesterId) {
    return { ok: false, error: "تأیید یا رد درخواست خودتان مجاز نیست" };
  }

  const note = input.note?.trim() || null;

  if (input.status === "PENDING_SUPERVISOR") {
    if (!input.actorCanSupervise) {
      return { ok: false, error: "شما مجاز به تأیید در مرحله‌ی سوپروایزر نیستید" };
    }

    if (!isInSupervisorScope(input.actorId, input.requesterSupervisorId)) {
      return { ok: false, error: "این فرد زیرمجموعه‌ی شما نیست" };
    }

    const approve = input.decision === "APPROVE";

    return {
      ok: true,
      patch: {
        status: approve ? "PENDING_MANAGER" : "REJECTED",
        supervisorDecision: approve ? "APPROVED" : "REJECTED",
        supervisorNote: note,
        supervisorById: input.actorId,
        supervisorAt: now,
      },
    };
  }

  if (input.status === "PENDING_MANAGER") {
    if (!input.actorCanFinal) {
      return { ok: false, error: "شما مجاز به تأیید نهایی نیستید" };
    }

    const approve = input.decision === "APPROVE";

    return {
      ok: true,
      patch: {
        status: approve ? "APPROVED" : "REJECTED",
        finalDecision: approve ? "APPROVED" : "REJECTED",
        finalNote: note,
        finalById: input.actorId,
        finalAt: now,
      },
    };
  }

  return { ok: false, error: "این درخواست در وضعیتی نیست که بتوان درباره‌اش تصمیم گرفت" };
}
