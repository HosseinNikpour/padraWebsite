"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { CrudCard, CrudPage } from "@/components/admin/crud/CrudPage";
import JalaliDateSelect from "@/components/staff/JalaliDateSelect";
import "@/components/staff/staff.css";
import { useFeedback } from "@/components/ui/Feedback";
import { formatDateTimeFa } from "@/lib/format";
import { formatJalali } from "@/lib/jalali";
import { CreatePanel, WorkTabs, WorkToolbar, type WorkTab } from "@/components/staff/Workspace";
import { matchesQuery } from "@/lib/search";
import { TASK_STATUS_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/tasks";

type TaskUpdate = { id: number; status: TaskStatus; note: string | null; createdAt: string; user: { name: string } };
type Assignment = {
  id: number;
  status: TaskStatus;
  completedAt: string | null;
  updates: TaskUpdate[];
  task: { id: number; title: string; description: string | null; dueDate: string | null; createdAt: string; createdBy: { name: string } };
};
type ManagedTask = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  createdBy: { name: string };
  assignments: { id: number; status: TaskStatus; completedAt: string | null; user: { id: number; name: string }; updates: TaskUpdate[] }[];
};
type Assignee = { id: number; name: string; role: { name: string } };

const badgeClass = (status: TaskStatus) =>
  status === "DONE" ? "st-badge st-badge--ok" : status === "IN_PROGRESS" ? "st-badge st-badge--pending" : "st-badge st-badge--muted";

/** سابقه‌ی گزارش‌ها با تاریخ (جدیدترین اول) */
function History({ updates }: { updates: TaskUpdate[] }) {
  if (!updates.length) return <p className="st-note">هنوز گزارشی ثبت نشده است.</p>;

  return (
    <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
      {updates.map((update) => (
        <li key={update.id} style={{ borderRight: "3px solid #1d6fd1", paddingRight: 10 }}>
          <small style={{ display: "block", color: "#64748b" }}>
            {formatDateTimeFa(update.createdAt)} · {update.user.name} ·{" "}
            <span className={badgeClass(update.status)}>{TASK_STATUS_LABEL[update.status]}</span>
          </small>
          {update.note ? <span style={{ whiteSpace: "pre-wrap" }}>{update.note}</span> : <em style={{ color: "#64748b" }}>تغییر وضعیت</em>}
        </li>
      ))}
    </ol>
  );
}

/** کارت تسک من + فرم گزارش روزانه */
function MyTaskCard({ assignment, onReport }: { assignment: Assignment; onReport: (a: Assignment, note: string, status: TaskStatus) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<TaskStatus>(assignment.status);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => setStatus(assignment.status), [assignment.status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);

    if (await onReport(assignment, note, status)) setNote("");

    setBusy(false);
  }

  const { task } = assignment;

  return (
    <article className="st-item">
      <header>
        <div>
          <strong>{task.title}</strong>
          <small>
            ایجادکننده: {task.createdBy.name} · تاریخ ایجاد: {formatDateTimeFa(task.createdAt)}
          </small>
        </div>
        <span className={badgeClass(assignment.status)}>{TASK_STATUS_LABEL[assignment.status]}</span>
      </header>

      {task.description && <p>{task.description}</p>}

      <dl>
        {task.dueDate && (
          <div>
            <dt>مهلت</dt>
            <dd>{formatJalali(String(task.dueDate).slice(0, 10), true)}</dd>
          </div>
        )}
        {assignment.completedAt && (
          <div>
            <dt>زمان تکمیل</dt>
            <dd>{formatDateTimeFa(assignment.completedAt)}</dd>
          </div>
        )}
      </dl>

      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <label className="st-field">
          <span>گزارش امروز (توضیحات و آخرین وضعیت کار)</span>
          <textarea className="st-textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} placeholder="مثلاً: بخش اول انجام شد، منتظر تأیید مدیر هستم" />
        </label>

        <div className="st-actions">
          <select className="st-select" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} aria-label="وضعیت تسک">
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <button className="st-btn st-btn--small" disabled={busy}>
            {busy ? "در حال ثبت..." : "ثبت گزارش"}
          </button>
          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "پنهان‌کردن سابقه" : `سابقه‌ی گزارش‌ها (${assignment.updates.length.toLocaleString("fa-IR")})`}
          </button>
        </div>
      </form>

      {showHistory && <History updates={assignment.updates} />}
    </article>
  );
}

export default function TasksPage() {
  const { confirm: confirmDialog, toast } = useFeedback();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [managed, setManaged] = useState<ManagedTask[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [error, setError] = useState("");

  // فرم ایجاد
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [managedQuery, setManagedQuery] = useState("");
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [tab, setTab] = useState<"mine" | "managed">("mine");
  const [showForm, setShowForm] = useState(false);
  const [mineQuery, setMineQuery] = useState("");

  const load = useCallback(async () => {
    const mine = await fetch("/api/tasks", { cache: "no-store" });
    const data = await mine.json();

    if (!mine.ok) throw new Error(data.error || "خطا در دریافت تسک‌ها");

    setAssignments(data.assignments ?? []);
    setCanCreate(!!data.canCreate);

    if (data.canCreate) {
      const [list, people] = await Promise.all([
        fetch("/api/tasks?scope=manage", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/tasks?scope=assignees", { cache: "no-store" }).then((r) => r.json()),
      ]);

      setManaged(Array.isArray(list) ? list : []);
      setAssignees(Array.isArray(people) ? people : []);
    }
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const visibleAssignees = useMemo(() => assignees.filter((a) => matchesQuery(`${a.name} ${a.role.name}`, assigneeQuery)), [assignees, assigneeQuery]);
  const visibleManaged = useMemo(
    () => managed.filter((task) => matchesQuery(`${task.title} ${task.createdBy.name} ${task.assignments.map((a) => a.user.name).join(" ")}`, managedQuery)),
    [managed, managedQuery]
  );

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (selected.size === 0) return setError("حداقل یک نفر را برای انجام تسک انتخاب کنید");

    try {
      setBusy(true);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, dueDate: dueDate || null, assigneeIds: [...selected] }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "خطا در ایجاد تسک");

      toast(`تسک برای ${data.assignedCount.toLocaleString("fa-IR")} نفر ثبت شد`, "success");
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelected(new Set());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ایجاد تسک");
    } finally {
      setBusy(false);
    }
  }

  async function report(assignment: Assignment, note: string, status: TaskStatus) {
    setError("");

    try {
      const response = await fetch(`/api/tasks/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, status }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "خطا در ثبت گزارش");

      toast("گزارش ثبت شد", "success");
      await load();

      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : "خطا در ثبت گزارش", "error");

      return false;
    }
  }

  async function archive(task: ManagedTask) {
    if (!(await confirmDialog(`تسک «${task.title}» بایگانی شود؟ سابقه‌ی گزارش‌ها حفظ می‌شود.`))) return;

    const response = await fetch(`/api/tasks?taskId=${task.id}`, { method: "DELETE" });

    if (!response.ok) return toast("بایگانی ناموفق بود", "error");

    await load();
  }

  const visibleMine = useMemo(
    () =>
      assignments.filter((a) =>
        matchesQuery(
          `${a.task.title} ${a.task.description ?? ""} ${a.task.createdBy.name} ${TASK_STATUS_LABEL[a.status]} ${a.updates.map((u) => u.note ?? "").join(" ")}`,
          mineQuery
        )
      ),
    [assignments, mineQuery]
  );

  const tabs: WorkTab<"mine" | "managed">[] = [
    { key: "mine", label: "تسک‌های من", badge: assignments.filter((a) => a.status !== "DONE").length },
    ...(canCreate ? [{ key: "managed" as const, label: "تسک‌های تعریف‌شده" }] : []),
  ];

  const createPanel = canCreate && (
    <CreatePanel open={showForm} title="ایجاد تسک برای پرسنل" description="انجام‌دهنده(ها) را انتخاب کنید. تاریخ ایجاد و ایجادکننده خودکار ثبت می‌شود.">
        <form onSubmit={create}>
          <div className="st-row">
            <div className="st-field">
              <label>عنوان تسک</label>
              <input className="st-input" value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} maxLength={120} required />
            </div>
            <div className="st-field">
              <label>مهلت انجام (اختیاری)</label>
              <JalaliDateSelect value={dueDate} onChange={setDueDate} />
              <button type="button" className="st-btn st-btn--small st-btn--ghost" onClick={() => setDueDate("")}>
                پاک‌کردن تاریخ
              </button>
            </div>
          </div>

          <div className="st-field">
            <label>توضیحات</label>
            <textarea className="st-textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>

          <div className="st-field">
            <label>
              انجام‌دهنده‌ها ({selected.size.toLocaleString("fa-IR")} نفر انتخاب شده)
            </label>
            <input className="st-input" type="search" value={assigneeQuery} onChange={(e) => setAssigneeQuery(e.target.value)} placeholder="جست‌وجوی نام یا نقش..." />
            <div className="st-actions" style={{ margin: "6px 0" }}>
              <button type="button" className="st-btn st-btn--small st-btn--ghost" onClick={() => setSelected(new Set(visibleAssignees.map((a) => a.id)))}>
                انتخاب همه‌ی نتایج
              </button>
              <button type="button" className="st-btn st-btn--small st-btn--ghost" onClick={() => setSelected(new Set())}>
                پاک‌کردن انتخاب
              </button>
            </div>
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto", border: "1px solid #d9e0ea", borderRadius: 10, padding: 8 }}>
              {visibleAssignees.length === 0 && <span className="st-note">کسی پیدا نشد.</span>}
              {visibleAssignees.map((person) => (
                <label key={person.id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.has(person.id)} onChange={() => toggle(person.id)} />
                  <span>
                    {person.name} <small style={{ color: "#64748b" }}>({person.role.name})</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button className="st-btn" disabled={busy}>
            {busy ? "در حال ثبت..." : "ایجاد و ارسال تسک"}
          </button>
        </form>
    </CreatePanel>
  );

  const toggleForm = canCreate ? () => setShowForm((v) => !v) : undefined;

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="کارتابل و تسک‌ها"
      description="تسک‌های محول‌شده را پیگیری کنید و هر روز گزارش پیشرفت بنویسید. مدیر مجموعه و سوپروایزر می‌توانند تسک تعریف و به پرسنل محول کنند."
    >
      {error && <div className="st-alert st-alert--error">{error}</div>}

      <WorkTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "mine" && (
        <CrudCard title="تسک‌های من" description="هر روز می‌توانید توضیحات و آخرین وضعیت کار را ثبت کنید؛ همه‌ی گزارش‌ها با تاریخ نگهداری می‌شوند.">
          <WorkToolbar search={mineQuery} onSearch={setMineQuery} actionLabel="تسک جدید" onAction={toggleForm} actionOpen={showForm} />
          {createPanel}

          {visibleMine.length === 0 ? (
            <div className="st-empty">{assignments.length ? "موردی با این جست‌وجو پیدا نشد." : "در حال حاضر تسکی به شما اختصاص داده نشده است."}</div>
          ) : (
            <div className="st-card-list">
              {visibleMine.map((assignment) => (
                <MyTaskCard key={assignment.id} assignment={assignment} onReport={report} />
              ))}
            </div>
          )}
        </CrudCard>
      )}

      {tab === "managed" && canCreate && (
        <CrudCard title="تسک‌های تعریف‌شده و گزارش انجام‌دهنده‌ها" description="وضعیت و سابقه‌ی گزارش هر نفر را ببینید.">
          <WorkToolbar search={managedQuery} onSearch={setManagedQuery} searchPlaceholder="جست‌وجو در عنوان، ایجادکننده یا انجام‌دهنده..." actionLabel="تسک جدید" onAction={toggleForm} actionOpen={showForm} />
          {createPanel}


            {visibleManaged.length === 0 ? (
              <div className="st-empty">تسکی پیدا نشد.</div>
            ) : (
              <div className="st-card-list" style={{ marginTop: 12 }}>
                {visibleManaged.map((task) => (
                  <article className="st-item" key={task.id}>
                    <header>
                      <div>
                        <strong>{task.title}</strong>
                        <small>
                          ایجادکننده: {task.createdBy.name} · تاریخ ایجاد: {formatDateTimeFa(task.createdAt)}
                          {task.dueDate ? ` · مهلت: ${formatJalali(String(task.dueDate).slice(0, 10))}` : ""}
                        </small>
                      </div>
                      <button type="button" className="st-btn st-btn--small st-btn--danger" onClick={() => archive(task)}>
                        بایگانی
                      </button>
                    </header>

                    {task.description && <p>{task.description}</p>}

                    <div style={{ display: "grid", gap: 8 }}>
                      {task.assignments.map((assignment) => {
                        const last = assignment.updates[0];
                        const open = openTask === assignment.id;

                        return (
                          <div key={assignment.id} style={{ borderTop: "1px solid #e5eaf1", paddingTop: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <strong>{assignment.user.name}</strong>
                              <span className={badgeClass(assignment.status)}>{TASK_STATUS_LABEL[assignment.status]}</span>
                              {last && <small style={{ color: "#64748b" }}>آخرین گزارش: {formatDateTimeFa(last.createdAt)}</small>}
                              <button type="button" className="st-btn st-btn--small st-btn--ghost" onClick={() => setOpenTask(open ? null : assignment.id)}>
                                {open ? "بستن سابقه" : `سابقه (${assignment.updates.length.toLocaleString("fa-IR")})`}
                              </button>
                            </div>
                            {last?.note && !open && <small style={{ display: "block", marginTop: 4 }}>{last.note}</small>}
                            {open && <History updates={assignment.updates} />}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
        </CrudCard>
      )}
    </CrudPage>
  );
}
