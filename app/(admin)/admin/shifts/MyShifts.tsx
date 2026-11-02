"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { CrudCard } from "@/components/admin/crud/CrudPage";
import { CreatePanel, DataTable, WorkToolbar, type Column } from "@/components/staff/Workspace";
import { matchesQuery } from "@/lib/search";
import JalaliDateSelect from "@/components/staff/JalaliDateSelect";
import ShiftChip from "@/components/staff/ShiftChip";
import { nowInTehran } from "@/lib/availability";
import { fa } from "@/lib/format";
import { addDaysStr, formatJalali, JALALI_MONTHS, monthRange, toJalali, weekdayIndex, weekStart, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/jalali";
import { isShiftType, SHIFT_META, SHIFT_TYPES, TEAM_SHIFT_TYPES, shiftRangeText, type ShiftType } from "@/lib/shifts";

type Swap = {
  id: number;
  date: string;
  currentType: string;
  requestedType: string;
  replacement: { id: number; name: string } | null;
  reason: string | null;
  status: string;
  decidedBy: string | null;
  decisionNote: string | null;
  history?: { actor: string; action: string; note: string | null; at: string }[];
};

type StaffItem = { id: number; name: string };

const SWAP_STATUS: Record<string, [string, string]> = {
  PENDING_SUPERVISOR: ["در انتظار تأیید سوپروایزر", "st-badge--pending"],
  APPROVED: ["تأیید شده", "st-badge--ok"],
  REJECTED: ["رد شده", "st-badge--bad"],
  CANCELLED: ["لغو شده", "st-badge--muted"],
};

export function Legend() {
  return (
    <div className="st-legend">
      {TEAM_SHIFT_TYPES.map((t) => (
        <span key={t}>
          <ShiftChip type={t} compact />
          {SHIFT_META[t].title} {shiftRangeText(t) && <bdi dir="ltr">{shiftRangeText(t)}</bdi>}
        </span>
      ))}
    </div>
  );
}

type MyShiftsProps = {
  myId?: number;
  /** calendar: تقویم شیفت من — swaps: درخواست‌های جابه‌جایی (جدول + فرم ایجاد) */
  section: "calendar" | "swaps";
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  /** وقتی روی یک روز تقویم زده می‌شود (برای رفتن به تب درخواست‌ها و باز کردن فرم) */
  onPickDate?: () => void;
};

export default function MyShifts({ myId, section, formOpen, onFormOpenChange, onPickDate }: MyShiftsProps) {
  const [query, setQuery] = useState("");
    const { confirm: confirmDialog, toast } = useFeedback();
  const today = nowInTehran().date;
  const [view, setView] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(today);
  const [cells, setCells] = useState<Record<string, ShiftType>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const j = toJalali(anchor);
  const range = useMemo(
    () => (view === "month" ? monthRange(j.jy, j.jm) : { start: weekStart(anchor), end: addDaysStr(weekStart(anchor), 6), days: 7 }),
    [view, anchor, j.jy, j.jm]
  );

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/shifts?scope=mine&from=${range.start}&to=${range.end}`, { cache: "no-store" });
      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا در دریافت شیفت‌ها");

      const map: Record<string, ShiftType> = {};

      for (const c of d.cells as { date: string; type: string }[]) if (isShiftType(c.type)) map[c.date] = c.type;

      setCells(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  function move(step: number) {
    if (view === "week") {
      setAnchor(addDaysStr(anchor, step * 7));
    } else {
      let jm = j.jm + step;
      let jy = j.jy;

      if (jm > 12) {
        jm = 1;
        jy++;
      } else if (jm < 1) {
        jm = 12;
        jy--;
      }

      setAnchor(monthRange(jy, jm).start);
    }
  }

  /* ---------- درخواست جابه‌جایی ---------- */
  const [swapDate, setSwapDate] = useState(today);
  const [swapCurrent, setSwapCurrent] = useState<ShiftType | null>(null);
  const [requested, setRequested] = useState<ShiftType | "">("");
  const [replacementId, setReplacementId] = useState("");
  const [reason, setReason] = useState("");
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [busy, setBusy] = useState(false);

  const loadSwaps = useCallback(async () => {
    const r = await fetch("/api/shifts/swaps?scope=mine", { cache: "no-store" });
    const d = await r.json();

    if (r.ok) setSwaps(d);
  }, []);

  useEffect(() => {
    void loadSwaps();

    fetch("/api/staff", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setStaff(d))
      .catch(() => {});
  }, [loadSwaps]);

  // با انتخاب تاریخ، شیفت همان روز بارگذاری می‌شود
  useEffect(() => {
    let cancelled = false;

    setRequested("");
    setSwapCurrent(null);

    fetch(`/api/shifts?scope=mine&from=${swapDate}&to=${swapDate}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;

        const type = d.cells?.[0]?.type;

        setSwapCurrent(isShiftType(type) ? type : null);
      })
      .catch(() => !cancelled && setSwapCurrent(null));

    return () => {
      cancelled = true;
    };
  }, [swapDate]);

  async function submitSwap(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setBusy(true);

      const r = await fetch("/api/shifts/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: swapDate, requestedType: requested, replacementId: replacementId || null, reason }),
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا در ثبت درخواست");

      setSuccess("درخواست جابه‌جایی ثبت شد و برای تأیید سوپروایزر ارسال گردید.");
      setReason("");
      setReplacementId("");
      setRequested("");
      onFormOpenChange?.(false);
      await loadSwaps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSwap(id: number) {
    if (!await confirmDialog("این درخواست لغو شود؟")) return;

    const r = await fetch(`/api/shifts/swaps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });

    const d = await r.json();

    if (!r.ok) setError(d.error || "خطا");
    else await loadSwaps();
  }

  const title = view === "month" ? `${JALALI_MONTHS[j.jm - 1]} ${j.jy.toLocaleString("fa-IR", { useGrouping: false })}` : `هفته‌ی ${formatJalali(range.start)}`;

  const canSwap = swapCurrent && swapCurrent !== "LEAVE" && swapDate >= today;

  const swapSearchText = (item: Swap) =>
    [
      formatJalali(item.date, true),
      item.date,
      SHIFT_META[item.currentType as ShiftType]?.label ?? "",
      SHIFT_META[item.requestedType as ShiftType]?.label ?? "",
      item.replacement?.name ?? "",
      item.reason ?? "",
      (SWAP_STATUS[item.status] ?? [item.status])[0],
      item.decidedBy ?? "",
      item.decisionNote ?? "",
    ].join(" ");

  const swapColumns: Column<Swap>[] = [
    { key: "date", label: "تاریخ", render: (item) => <strong>{formatJalali(item.date, true)}</strong> },
    {
      key: "change",
      label: "تغییر شیفت",
      render: (item) => (
        <>
          <bdi>{SHIFT_META[item.currentType as ShiftType]?.label}</bdi> ← <bdi>{SHIFT_META[item.requestedType as ShiftType]?.label}</bdi>
        </>
      ),
    },
    { key: "replacement", label: "جایگزین", render: (item) => item.replacement?.name ?? "—" },
    {
      key: "status",
      label: "وضعیت",
      render: (item) => {
        const [label, cls] = SWAP_STATUS[item.status] ?? [item.status, ""];

        return <span className={`st-badge ${cls}`}>{label}</span>;
      },
    },
    {
      key: "details",
      label: "جزئیات",
      render: (item) => (
        <>
          {item.reason && <div>{item.reason}</div>}
          {item.decisionNote && <small className="ws-cell-muted">{item.decidedBy}: {item.decisionNote}</small>}
          {item.history && item.history.length > 0 && <details ><summary>سوابق تصمیم‌ها ({fa(item.history.length)})</summary>{item.history.map((h, i) => <div key={`${item.id}-history-${i}`}>{h.actor} · {h.action === "SUBMITTED" ? "ثبت درخواست" : h.action === "APPROVED" ? "تأیید" : h.action === "REJECTED" ? "رد" : "لغو"}{h.note ? ` — ${h.note}` : ""} · {new Date(h.at).toLocaleString("fa-IR")}</div>)}</details>}
        </>
      ),
    },
    {
      key: "actions",
      label: "عملیات",
      render: (item) =>
        item.status === "PENDING_SUPERVISOR" ? (
          <button type="button" className="st-btn st-btn--danger st-btn--small" onClick={() => cancelSwap(item.id)}>
            لغو درخواست
          </button>
        ) : null,
    },
  ];

  return (
    <>
      {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}
      {success && <div className="st-alert st-alert--ok" role="status">{success}</div>}

      {section === "calendar" && (
        <CrudCard title="تقویم شیفت من">
          <div className="st-toolbar">
            <div className="st-nav">
              <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => move(-1)} aria-label="قبلی">›</button>
              <strong>{title}</strong>
              <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => move(1)} aria-label="بعدی">‹</button>
              <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => setAnchor(today)}>امروز</button>
            </div>

            <div className="st-actions">
              <button type="button" className={`st-btn st-btn--small ${view === "month" ? "" : "st-btn--ghost"}`} onClick={() => setView("month")}>ماهانه</button>
              <button type="button" className={`st-btn st-btn--small ${view === "week" ? "" : "st-btn--ghost"}`} onClick={() => setView("week")}>هفتگی</button>
            </div>
          </div>

          <Legend />

          {view === "month" ? (
            <div className="sh-month">
              {WEEKDAY_NAMES.map((n) => (
                <div key={n} className="sh-month__head">{WEEKDAY_SHORT[WEEKDAY_NAMES.indexOf(n)]}</div>
              ))}

              {Array.from({ length: weekdayIndex(range.start) }, (_, i) => (
                <div key={`b${i}`} className="sh-day sh-day--blank" />
              ))}

              {Array.from({ length: range.days }, (_, i) => {
                const date = addDaysStr(range.start, i);
                const type = cells[date];

                return (
                  <button
                    type="button"
                    key={date}
                    className={`sh-day ${date === today ? "sh-day--today" : ""} ${weekdayIndex(date) === 6 ? "sh-day--friday" : ""}`}
                    onClick={() => {
                      setSwapDate(date);
                      onPickDate?.();
                    }}
                    title="انتخاب برای درخواست جابه‌جایی"
                  >
                    <span className="sh-day__num">{toJalali(date).jd.toLocaleString("fa-IR")}</span>
                    <ShiftChip type={type} compact />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="sh-week">
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDaysStr(range.start, i);

                return (
                  <div key={date} className={`sh-week__row ${date === today ? "sh-day--today" : ""}`}>
                    <div>
                      <strong>{WEEKDAY_NAMES[i]}</strong>
                      <small>{formatJalali(date)}</small>
                    </div>
                    <ShiftChip type={cells[date]} showTime />
                  </div>
                );
              })}
            </div>
          )}
        </CrudCard>
      )}

      {section === "swaps" && (
        <CrudCard title="درخواست‌های جابه‌جایی شیفت من" description={`تعداد درخواست‌های ثبت‌شده: ${fa(swaps.length)}`}>
          <WorkToolbar search={query} onSearch={setQuery} actionLabel="درخواست جابه‌جایی جدید" onAction={() => onFormOpenChange?.(!formOpen)} actionOpen={!!formOpen} />

          <CreatePanel
            open={!!formOpen}
            title="درخواست جابه‌جایی شیفت"
            description="تاریخ را انتخاب کنید؛ شیفت آن روز نمایش داده می‌شود. شیفت جدید و در صورت نیاز جایگزین را مشخص کنید."
          >
    <form onSubmit={submitSwap}>
      <div className="st-row">
        <div className="st-field">
          <label>تاریخ</label>
          <JalaliDateSelect value={swapDate} onChange={setSwapDate} />
        </div>

        <div className="st-field">
          <label>شیفت فعلی در این روز</label>
          <div>
            {swapCurrent ? <ShiftChip type={swapCurrent} showTime /> : <span className="st-note">برای این روز شیفتی ثبت نشده است.</span>}
          </div>
        </div>
      </div>

      <div className="st-row">
        <div className="st-field">
          <label>تغییر به</label>
          <select className="st-select" value={requested} onChange={(e) => setRequested(e.target.value as ShiftType)} required disabled={!canSwap}>
            <option value="">انتخاب شیفت جدید</option>
            {SHIFT_TYPES.filter((t) => t !== swapCurrent && t !== "LEAVE" && t !== "ABSENT").map((t) => (
              <option key={t} value={t}>
                {SHIFT_META[t].label} — {SHIFT_META[t].title} {shiftRangeText(t)}
              </option>
            ))}
          </select>
        </div>

        <div className="st-field">
          <label>جایگزین (اختیاری)</label>
          <select className="st-select" value={replacementId} onChange={(e) => setReplacementId(e.target.value)} disabled={!canSwap}>
            <option value="">بدون جایگزین</option>
            {staff.filter((s) => s.id !== myId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <small>جایگزین، شیفتی را که واگذار می‌کنید به شیفت خودش اضافه می‌کند.</small>
        </div>
      </div>

      <div className="st-field">
        <label>دلیل (اختیاری)</label>
        <textarea className="st-textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </div>

      <button type="submit" className="st-btn" disabled={busy || !canSwap || !requested}>
        ارسال برای تأیید سوپروایزر
      </button>
    </form>
          </CreatePanel>

          <DataTable
            rows={swaps.filter((item) => matchesQuery(swapSearchText(item), query))}
            rowKey={(item) => item.id}
            empty={swaps.length ? "موردی با این جست‌وجو پیدا نشد." : "درخواستی ثبت نشده است."}
            columns={swapColumns}
          />
        </CrudCard>
      )}
    </>
  );
}
