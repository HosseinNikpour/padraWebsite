import { SHIFT_META, type ShiftType } from "@/lib/shifts";

export default function ShiftChip({
  type,
  compact,
  showTime,
}: {
  type: ShiftType | null | undefined;
  compact?: boolean;
  showTime?: boolean;
}) {
  if (!type) return <span className="st-chip st-chip--empty">—</span>;

  const m = SHIFT_META[type];

  return (
    <span
      className={`st-chip ${compact ? "st-chip--compact" : ""}`}
      style={{ background: m.bg, color: m.color, borderColor: m.color }}
      title={`${m.title}${m.start ? ` (${m.start}–${m.end})` : ""}`}
    >
      {m.label}
      {showTime && m.start && <small dir="ltr">{m.start}–{m.end}</small>}
    </span>
  );
}
