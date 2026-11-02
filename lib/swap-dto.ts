import { prisma } from "@/lib/prisma";
import { dateStr } from "@/lib/staff";

export const swapInclude = {
  requester: { select: { id: true, name: true, supervisorId: true } },
  replacement: { select: { id: true, name: true } },
  decidedBy: { select: { name: true } },
  history: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

type Row = Awaited<ReturnType<typeof prisma.shiftSwapRequest.findMany<{ include: typeof swapInclude }>>>[number];

export function toSwapDto(r: Row) {
  return {
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name },
    date: dateStr(r.date),
    currentType: r.currentType,
    requestedType: r.requestedType,
    replacement: r.replacement ? { id: r.replacement.id, name: r.replacement.name } : null,
    reason: r.reason,
    status: r.status,
    decidedBy: r.decidedBy?.name ?? null,
    decisionNote: r.decisionNote,
    decidedAt: r.decidedAt,
    history: r.history.map((h) => ({ actor: h.actor.name, action: h.action, note: h.note, at: h.createdAt })),
    createdAt: r.createdAt,
  };
}
