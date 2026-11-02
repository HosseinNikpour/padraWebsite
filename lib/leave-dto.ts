import { prisma } from "@/lib/prisma";
import { dateStr } from "@/lib/staff";

export const leaveInclude = {
  user: { select: { id: true, name: true, supervisorId: true } },
  supervisorBy: { select: { name: true } },
  finalBy: { select: { name: true } },
  entries: { orderBy: { date: "asc" as const } },
  history: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

type Row = Awaited<ReturnType<typeof prisma.leaveRequest.findMany<{ include: typeof leaveInclude }>>>[number];

export function toLeaveDto(r: Row) {
  return {
    id: r.id,
    user: { id: r.user.id, name: r.user.name },
    type: r.type,
    startDate: dateStr(r.startDate),
    endDate: dateStr(r.endDate),
    days: r.days,
    entries: r.entries.map((e) => ({ date: dateStr(e.date), type: e.type ?? r.type, startTime: e.startTime, endTime: e.endTime })),
    reason: r.reason,
    status: r.status,
    supervisor: r.supervisorDecision
      ? { name: r.supervisorBy?.name ?? null, decision: r.supervisorDecision, note: r.supervisorNote, at: r.supervisorAt }
      : null,
    final: r.finalDecision
      ? { name: r.finalBy?.name ?? null, decision: r.finalDecision, note: r.finalNote, at: r.finalAt }
      : null,
    history: r.history.map((h) => ({ actor: h.actor.name, action: h.action, note: h.note, at: h.createdAt })),
    createdAt: r.createdAt,
  };
}

