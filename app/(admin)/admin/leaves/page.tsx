"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, Plus } from "@/components/ui/Icons";

import { CrudCard, CrudPage } from "@/components/admin/crud/CrudPage";
import JalaliDateSelect from "@/components/staff/JalaliDateSelect";
import "@/components/staff/staff.css";
import { nowInTehran } from "@/lib/availability";
import { fa } from "@/lib/format";
import { addDaysStr, formatJalali, jalaliShort, monthRange, toJalali, JALALI_MONTHS } from "@/lib/jalali";
import { LEAVE_STATUS_LABEL, LEAVE_TYPES } from "@/lib/leave";
import { CreatePanel, DataTable, WorkTabs, WorkToolbar, type Column, type WorkTab } from "@/components/staff/Workspace";
import { matchesQuery } from "@/lib/search";
import { useStaffMe } from "@/lib/use-staff-me";

type Leave = {
  id: number;
  user: { id: number; name: string };
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  entries?: { date: string; type?: string; startTime: string | null; endTime: string | null }[];
  reason: string | null;
  status: string;
  supervisor: { name: string | null; decision: string; note: string | null } | null;
  final: { name: string | null; decision: string; note: string | null } | null;
  history?: { actor: string; action: string; note: string | null; at: string }[];
};

type Tab = "mine" | "taken" | "approvals" | "all";

const statusClass = (s: string) =>
  s === "APPROVED" ? "st-badge--ok" : s === "REJECTED" ? "st-badge--bad" : s === "CANCELLED" ? "st-badge--muted" : "st-badge--pending";

function rangeText(l: Leave) {
  return l.startDate === l.endDate
    ? formatJalali(l.startDate, true)
    : `${jalaliShort(l.startDate)} تا ${formatJalali(l.endDate)}`;
}

function leaveKind(leave: Leave) {
  return LEAVE_TYPES[leave.type] ?? (leave.type === "MIXED" ? "مرخصی ترکیبی" : "مرخصی");
}

function leaveCount(leave: Leave) {
  return leave.type === "HOURLY"
    ? `${fa(leave.entries?.length ?? 0)} ردیف ساعتی`
    : leave.type === "MIXED"
      ? `${fa(leave.days)} روز غیرساعتی + ${fa((leave.entries ?? []).filter((e) => (e.type ?? leave.type) === "HOURLY").length)} ردیف ساعتی`
      : `${fa(leave.days)} روز`;
}

function leaveDates(leave: Leave) {
  return leave.entries && leave.entries.length > 0
    ? leave.entries
        .map((e) => `${formatJalali(e.date, true)} · ${LEAVE_TYPES[e.type ?? leave.type] ?? "مرخصی"}${e.startTime && e.endTime ? ` (${e.startTime} تا ${e.endTime})` : ""}`)
        .join("، ")
    : rangeText(leave);
}

function leaveSearchText(leave: Leave) {
  return [
    leave.user.name,
    leaveKind(leave),
    leaveCount(leave),
    leaveDates(leave),
    leave.startDate,
    leave.endDate,
    LEAVE_STATUS_LABEL[leave.status] ?? leave.status,
    leave.reason ?? "",
    leave.supervisor?.name ?? "",
    leave.supervisor?.note ?? "",
    leave.final?.name ?? "",
    leave.final?.note ?? "",
  ].join(" ");
}

/** توضیحات + تصمیم‌ها + سوابق گردش یک مرخصی (ستون «جزئیات») */
function LeaveDetails({ leave }: { leave: Leave }) {
  return (
    <>
      {leave.reason && <div>{leave.reason}</div>}

      {leave.supervisor && leave.supervisor.decision !== "SKIPPED" && (
        <small className="ws-cell-muted">
          سوپروایزر{leave.supervisor.name ? ` (${leave.supervisor.name})` : ""}: {leave.supervisor.decision === "APPROVED" ? "تأیید" : "رد"}
          {leave.supervisor.note ? ` — ${leave.supervisor.note}` : ""}
        </small>
      )}

      {leave.final && (
        <small className="ws-cell-muted">
          مدیر{leave.final.name ? ` (${leave.final.name})` : ""}: {leave.final.decision === "APPROVED" ? "تأیید نهایی" : "رد"}
          {leave.final.note ? ` — ${leave.final.note}` : ""}
        </small>
      )}

      {leave.history && leave.history.length > 0 && (
        <details>
          <summary>سوابق گردش ({fa(leave.history.length)})</summary>
          {leave.history.map((h, i) => (
            <div key={`${leave.id}-history-${i}`}>
              {h.actor} · {h.action === "SUBMITTED" ? "ثبت درخواست" : h.action === "APPROVED" ? "تأیید" : h.action === "REJECTED" ? "رد" : "لغو"}
              {h.note ? ` — ${h.note}` : ""} · {new Date(h.at).toLocaleString("fa-IR")}
            </div>
          ))}
        </details>
      )}
    </>
  );
}

function leaveColumns({ showUser, actions }: { showUser?: boolean; actions?: (leave: Leave) => React.ReactNode }): Column<Leave>[] {
  return [
    ...(showUser ? [{ key: "user", label: "پرسنل", render: (l: Leave) => <strong>{l.user.name}</strong> }] : []),
    {
      key: "kind",
      label: "نوع مرخصی",
      render: (l: Leave) => (
        <>
          {leaveKind(l)}
          <small className="ws-cell-muted">{leaveCount(l)}</small>
        </>
      ),
    },
    { key: "dates", label: "تاریخ‌ها", render: (l: Leave) => leaveDates(l) },
    { key: "status", label: "وضعیت", render: (l: Leave) => <span className={`st-badge ${statusClass(l.status)}`}>{LEAVE_STATUS_LABEL[l.status]}</span> },
    { key: "details", label: "جزئیات و تصمیم‌ها", render: (l: Leave) => <LeaveDetails leave={l} /> },
    ...(actions ? [{ key: "actions", label: "عملیات", render: (l: Leave) => actions(l) }] : []),
  ];
}

export default function LeavesPage() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const { can, loaded } = useStaffMe();

  const [tab, setTab] = useState<Tab>("mine");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [mine, setMine] = useState<Leave[]>([]);
  const [approvals, setApprovals] = useState<Leave[]>([]);
  const [all, setAll] = useState<Leave[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});

  // فرم
  const today = nowInTehran().date;
  const [entries, setEntries] = useState<{ date: string; type: string; startTime: string; endTime: string }[]>([{ date: today, type: "DAILY", startTime: "10:00", endTime: "11:00" }]);
  const [reason, setReason] = useState("");

  // فیلتر «همه‌ی مرخصی‌ها»
  const todayJ = toJalali(today);
  const [fy, setFy] = useState(todayJ.jy);
  const [fm, setFm] = useState(todayJ.jm);
  const [fStatus, setFStatus] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const canApprove = !!can && (can.leaveSupervise || can.leaveFinal);

  const loadMine = useCallback(async () => {
    const r = await fetch("/api/leaves?scope=mine", { cache: "no-store" });
    const d = await r.json();

    if (!r.ok) throw new Error(d.error || "خطا در دریافت مرخصی‌ها");

    setMine(d);
  }, []);

  const loadApprovals = useCallback(async () => {
    const r = await fetch("/api/leaves?scope=approvals", { cache: "no-store" });
    const d = await r.json();

    if (!r.ok) throw new Error(d.error || "خطا در دریافت درخواست‌ها");

    setApprovals(d);
  }, []);

  const loadAll = useCallback(async () => {
    const range = monthRange(fy, fm);
    const r = await fetch(`/api/leaves?scope=all&from=${range.start}&to=${range.end}`, { cache: "no-store" });
    const d = await r.json();

    if (!r.ok) throw new Error(d.error || "خطا در دریافت مرخصی‌ها");

    setAll(d);
  }, [fy, fm]);

  useEffect(() => {
    if (!loaded) return;

    loadMine().catch((e) => setError(e.message));

    if (canApprove) loadApprovals().catch((e) => setError(e.message));
  }, [loaded, canApprove, loadMine, loadApprovals]);

  useEffect(() => {
    if (tab === "all" && can?.leaveViewAll) loadAll().catch((e) => setError(e.message));
  }, [tab, can?.leaveViewAll, loadAll]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!entries.length || entries.some((e) => !e.date || !e.type)) {
      setError("حداقل یک ردیف با تاریخ و نوع مرخصی وارد کنید");
      return;
    }
    if (new Set(entries.map((e) => e.date)).size !== entries.length) {
      setError("تاریخ تکراری وجود دارد");
      return;
    }
    if (entries.some((e) => e.type === "HOURLY" && (!e.startTime || !e.endTime || e.endTime <= e.startTime))) {
      setError("ساعت شروع و پایان هر ردیف ساعتی را درست وارد کنید");
      return;
    }

    try {
      setBusy(true);

      const r = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: entries.map((e) => ({ date: e.date, type: e.type, startTime: e.type === "HOURLY" ? e.startTime : null, endTime: e.type === "HOURLY" ? e.endTime : null })), reason }),
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا در ثبت درخواست");

      setSuccess("درخواست مرخصی ثبت شد و برای تأیید ارسال گردید.");
      setReason("");
      setEntries([{ date: today, type: "DAILY", startTime: "10:00", endTime: "11:00" }]);
      setShowForm(false);
      await loadMine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت درخواست");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: number, action: "approve" | "reject" | "cancel") {
    if (action === "cancel" && !await confirmDialog("این درخواست لغو شود؟")) return;

    setError("");
    setSuccess("");

    try {
      setBusy(true);

      const r = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا");

      setSuccess(action === "approve" ? "تأیید شد." : action === "reject" ? "رد شد." : "لغو شد.");

      await Promise.all([loadMine(), canApprove ? loadApprovals() : Promise.resolve(), tab === "all" ? loadAll() : Promise.resolve()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  const days = entries.filter((e) => e.type !== "HOURLY").length;
  const hourlyRows = entries.filter((e) => e.type === "HOURLY").length;

  const taken = useMemo(() => mine.filter((l) => l.status === "APPROVED" && l.endDate < today), [mine, today]);
  const upcoming = useMemo(() => mine.filter((l) => l.status === "APPROVED" && l.endDate >= today), [mine, today]);
  const pendingMine = mine.filter((l) => l.status === "PENDING_SUPERVISOR" || l.status === "PENDING_MANAGER");

  const usedThisYear = useMemo(() => {
    let sum = 0;

    for (const l of mine) {
      if (l.status !== "APPROVED") continue;

      // روزهایی از مرخصی که در سال شمسی جاری هستند و تا امروز گذشته‌اند
      for (let i = 0; i < l.days; i++) {
        const d = addDaysStr(l.startDate, i);

        if (d <= today && toJalali(d).jy === todayJ.jy) sum++;
      }
    }

    return sum;
  }, [mine, today, todayJ.jy]);

  const filteredAll = all.filter((l) => !fStatus || l.status === fStatus);

  const decisionActions = (l: Leave) => (
    <>
      <input
        className="st-input"
        placeholder="یادداشت (اختیاری)"
        value={notes[l.id] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))}
        maxLength={500}
      />
      <div className="st-actions">
        <button type="button" className="st-btn st-btn--ok st-btn--small" disabled={busy} onClick={() => act(l.id, "approve")}>
          {l.status === "PENDING_MANAGER" ? "تأیید نهایی" : "تأیید"}
        </button>
        <button type="button" className="st-btn st-btn--danger st-btn--small" disabled={busy} onClick={() => act(l.id, "reject")}>
          رد
        </button>
      </div>
    </>
  );

  const tabs: WorkTab<Tab>[] = [
    { key: "mine", label: "درخواست‌های من", badge: pendingMine.length },
    { key: "taken", label: "مرخصی‌های استفاده‌شده" },
    ...(canApprove ? [{ key: "approvals" as Tab, label: "تأیید درخواست‌ها", badge: approvals.length }] : []),
    ...(can?.leaveViewAll ? [{ key: "all" as Tab, label: "مرخصی پرسنل" }] : []),
  ];

  const changeTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setShowForm(false);
  };

  const filter = (rows: Leave[]) => rows.filter((l) => matchesQuery(leaveSearchText(l), query));

  const cancelAction = (label: string, allowed: (l: Leave) => boolean) => (l: Leave) =>
    allowed(l) ? (
      <button type="button" className="st-btn st-btn--danger st-btn--small" disabled={busy} onClick={() => act(l.id, "cancel")}>
        {label}
      </button>
    ) : null;

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="مرخصی"
      description="ثبت درخواست مرخصی، پیگیری تأییدها و مشاهده‌ی مرخصی‌های استفاده‌شده"
    >
      <div className="leave-management-page">
        {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}
        {success && <div className="st-alert st-alert--ok" role="status">{success}</div>}

        <WorkTabs tabs={tabs} value={tab} onChange={changeTab} />

        {tab === "mine" && (
          <CrudCard title="درخواست‌های من" description={`مرخصی‌های تأییدشده‌ی پیش‌رو: ${fa(upcoming.length)}`}>
            <WorkToolbar search={query} onSearch={setQuery} actionLabel="درخواست مرخصی جدید" onAction={() => setShowForm((v) => !v)} actionOpen={showForm} />

            <CreatePanel
              open={showForm}
              title="ثبت درخواست مرخصی"
              description={can?.leaveSupervise ? "درخواست شما مستقیم برای تأیید نهایی مدیر ارسال می‌شود." : "درخواست ابتدا نزد سوپروایزر و سپس برای تأیید نهایی نزد مدیر می‌رود."}
            >
        <form onSubmit={submit}>
          <div className="leave-summary-strip">
            <span><strong>{fa(days)}</strong> ردیف روزانه/استعلاجی</span>
            <span><strong>{fa(hourlyRows)}</strong> ردیف ساعتی</span>
            <span className="leave-summary-hint">نوع و تاریخ هر ردیف جداگانه قابل انتخاب است.</span>
          </div>

          <div className="st-field">
            <label>ردیف‌های مرخصی</label>
            <div className="st-card-list leave-entry-list">
              {entries.map((entry, index) => (
                <div className="leave-entry-card" key={`leave-entry-${index}`}>
                  <div className="leave-entry-heading"><span>ردیف {fa(index + 1)}</span>{entries.length > 1 && <button type="button" className="leave-delete-icon" aria-label={`حذف ردیف ${index + 1}`} title="حذف ردیف" onClick={() => setEntries((old) => old.filter((_, i) => i !== index))}><Trash2 size={16} /></button>}</div>
                  <div className="leave-entry-fields">
                    <div className="st-field">
                      <label>تاریخ</label>
                      <JalaliDateSelect value={entry.date} onChange={(date) => setEntries((old) => old.map((item, i) => i === index ? { ...item, date } : item))} />
                    </div>
                    <div className="st-field">
                      <label>نوع مرخصی</label>
                      <select className="st-select" value={entry.type} onChange={(e) => setEntries((old) => old.map((item, i) => i === index ? { ...item, type: e.target.value } : item))}>
                         <option value="DAILY">روزانه</option><option value="HOURLY">ساعتی</option><option value="SICK">استعلاجی</option>
                      </select>
                    </div>
                    {entry.type === "HOURLY" && <>
                      <div className="st-field"><label>ساعت شروع</label><input className="st-input" type="time" value={entry.startTime} onChange={(e) => setEntries((old) => old.map((item, i) => i === index ? { ...item, startTime: e.target.value } : item))} /></div>
                      <div className="st-field"><label>ساعت پایان</label><input className="st-input" type="time" value={entry.endTime} onChange={(e) => setEntries((old) => old.map((item, i) => i === index ? { ...item, endTime: e.target.value } : item))} /></div>
                    </>}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="st-btn st-btn--ghost st-btn--small leave-add-row" onClick={() => setEntries((old) => [...old, { date: addDaysStr(old[old.length - 1]?.date ?? today, 1), type: old[old.length - 1]?.type ?? "DAILY", startTime: "10:00", endTime: "11:00" }])}><Plus size={16} /> افزودن ردیف مرخصی</button>
          </div>

          <div className="st-field">
            <label>توضیحات (اختیاری)</label>
            <textarea className="st-textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>

          <button type="submit" className="st-btn" disabled={busy}>
            ثبت درخواست
          </button>
        </form>
            </CreatePanel>

            <DataTable
              rows={filter(mine)}
              rowKey={(l) => l.id}
              empty={mine.length ? "موردی با این جست‌وجو پیدا نشد." : "هنوز درخواستی ثبت نکرده‌اید."}
              columns={leaveColumns({ actions: cancelAction("لغو درخواست", (l) => l.status === "PENDING_SUPERVISOR" || l.status === "PENDING_MANAGER") })}
            />
          </CrudCard>
        )}

        {tab === "taken" && (
          <CrudCard
            title="مرخصی‌های استفاده‌شده"
            description={`مجموع روزهای مرخصی تأییدشده‌ی استفاده‌شده در سال ${todayJ.jy.toLocaleString("fa-IR", { useGrouping: false })}: ${fa(usedThisYear)} روز`}
          >
            <WorkToolbar search={query} onSearch={setQuery} />
            <DataTable
              rows={filter(taken)}
              rowKey={(l) => l.id}
              empty={taken.length ? "موردی با این جست‌وجو پیدا نشد." : "هنوز مرخصی تأییدشده‌ای را استفاده نکرده‌اید."}
              columns={leaveColumns({})}
            />
          </CrudCard>
        )}

        {tab === "approvals" && canApprove && (
          <CrudCard title="درخواست‌های در انتظار تصمیم شما" description="درخواست‌های سوپروایزر مرحله‌ی اول دارد و تأیید نهایی با مدیر است.">
            <WorkToolbar search={query} onSearch={setQuery} />
            <DataTable
              rows={filter(approvals)}
              rowKey={(l) => l.id}
              empty={approvals.length ? "موردی با این جست‌وجو پیدا نشد." : "درخواستی در انتظار تصمیم شما نیست."}
              columns={leaveColumns({ showUser: true, actions: decisionActions })}
            />
          </CrudCard>
        )}

        {tab === "all" && can?.leaveViewAll && (
          <CrudCard title="مرخصی پرسنل">
            <WorkToolbar search={query} onSearch={setQuery}>
              <select className="st-select" value={fm} onChange={(e) => setFm(Number(e.target.value))} aria-label="ماه">
                {JALALI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className="st-select" value={fy} onChange={(e) => setFy(Number(e.target.value))} aria-label="سال">
                {[todayJ.jy - 1, todayJ.jy, todayJ.jy + 1].map((y) => (
                  <option key={y} value={y}>{y.toLocaleString("fa-IR", { useGrouping: false })}</option>
                ))}
              </select>
              <select className="st-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="وضعیت">
                <option value="">همه‌ی وضعیت‌ها</option>
                {Object.entries(LEAVE_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </WorkToolbar>
            <DataTable
              rows={filter(filteredAll)}
              rowKey={(l) => l.id}
              empty="مرخصی‌ای در این ماه پیدا نشد."
              columns={leaveColumns({
                showUser: true,
                actions: can?.leaveFinal
                  ? cancelAction("لغو مرخصی", (l) => l.status === "APPROVED" || l.status === "PENDING_SUPERVISOR" || l.status === "PENDING_MANAGER")
                  : undefined,
              })}
            />
          </CrudCard>
        )}
      </div>
    </CrudPage>
  );
}
