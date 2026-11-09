"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CrudCard } from "@/components/admin/crud/CrudPage";
import ShiftChip from "@/components/staff/ShiftChip";
import { nowInTehran } from "@/lib/availability";
import { fa } from "@/lib/format";
import { addDaysStr, formatJalali, JALALI_MONTHS, monthRange, toJalali, weekdayIndex, weekStart, WEEKDAY_SHORT } from "@/lib/jalali";
import { isShiftType, SHIFT_META, SHIFT_TYPES, TEAM_SHIFT_TYPES, shiftRangeText, type ShiftType } from "@/lib/shifts";

import { Legend } from "./MyShifts";

type Staff = { id: number; name: string; role: string; supervisorId: number | null };
type Cell = { userId: number; date: string; type: string };
type View = "day" | "week" | "month";

export default function TeamShifts() {
  const today = nowInTehran().date;
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [cells, setCells] = useState<Map<string, ShiftType>>(new Map());
  const [canManage, setCanManage] = useState(false);
  const [edit, setEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ staff: Staff; date: string } | null>(null);
  const [copyInfo, setCopyInfo] = useState<{ sourceCount: number; targetCount: number } | null>(null);
  const [notice, setNotice] = useState("");

  const j = toJalali(anchor);

  const range = useMemo(() => {
    if (view === "day") return { start: anchor, end: anchor, days: 1 };
    if (view === "week") return { start: weekStart(anchor), end: addDaysStr(weekStart(anchor), 6), days: 7 };

    return monthRange(j.jy, j.jm);
  }, [view, anchor, j.jy, j.jm]);

  const dates = useMemo(() => Array.from({ length: range.days }, (_, i) => addDaysStr(range.start, i)), [range]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/shifts?scope=team&from=${range.start}&to=${range.end}`, { cache: "no-store" });
      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا در دریافت شیفت‌ها");

      setStaff(d.staff);
      setCanManage(!!d.canManage);

      const map = new Map<string, ShiftType>();

      for (const c of d.cells as Cell[]) if (isShiftType(c.type)) map.set(`${c.userId}|${c.date}`, c.type);

      setCells(map);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  function move(step: number) {
    setNotice("");

    if (view === "day") return setAnchor(addDaysStr(anchor, step));
    if (view === "week") return setAnchor(addDaysStr(anchor, step * 7));

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

  async function setCell(userId: number, date: string, type: ShiftType | null) {
    setSaving(true);
    setError("");

    try {
      const r = await fetch("/api/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells: [{ userId, date, type }] }),
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا در ذخیره");

      setEditor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function copyRequest(mode: "preview" | "fill" | "replace") {
    const r = await fetch("/api/shifts/copy-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: range.start, mode }),
    });

    const d = await r.json();

    if (!r.ok) throw new Error(d.error || "خطا در کپی شیفت‌ها");

    return d;
  }

  async function openCopy() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const d = await copyRequest("preview");

      if (d.sourceCount === 0) throw new Error("برای هفته‌ی قبل شیفتی ثبت نشده است");

      setCopyInfo({ sourceCount: d.sourceCount, targetCount: d.targetCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function doCopy(mode: "fill" | "replace") {
    setSaving(true);
    setError("");

    try {
      const d = await copyRequest(mode);

      setCopyInfo(null);
      setNotice(`${fa(d.copied)} شیفت از هفته‌ی قبل کپی شد${d.skipped ? ` (${fa(d.skipped)} خانه‌ی پرشده حفظ شد)` : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  const visibleStaff = staff.filter((s) => !search.trim() || s.name.includes(search.trim()));
  const title =
    view === "month"
      ? `${JALALI_MONTHS[j.jm - 1]} ${j.jy.toLocaleString("fa-IR", { useGrouping: false })}`
      : view === "week"
        ? `هفته‌ی ${formatJalali(range.start)}`
        : formatJalali(anchor, true);

  const typeAt = (id: number, date: string) => cells.get(`${id}|${date}`) ?? null;

  return (
    <CrudCard
      title="شیفت پرسنل"
      description="مشاهده‌ی شیفت همه‌ی پرسنل به‌صورت روزانه، هفتگی و ماهانه"
      actions={
        canManage ? (
          <button type="button" className={`st-btn st-btn--small ${edit ? "st-btn--ok" : "st-btn--ghost"}`} onClick={() => setEdit((v) => !v)}>
            {edit ? "پایان ویرایش" : "ویرایش شیفت‌ها"}
          </button>
        ) : undefined
      }
    >
      {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}
      {notice && <div className="st-alert st-alert--ok" role="status">{notice}</div>}
      {edit && <div className="st-alert st-alert--ok">حالت ویرایش: روی هر خانه بزنید تا شیفت آن را تعیین کنید. مرخصی تأییدشده همیشه روی شیفت اولویت دارد.</div>}

      <div className="st-toolbar">
        <div className="st-nav">
          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => move(-1)} aria-label="قبلی">›</button>
          <strong>{title}</strong>
          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => move(1)} aria-label="بعدی">‹</button>
          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => setAnchor(today)}>امروز</button>
        </div>

        <div className="st-actions">
          {canManage && view === "week" && (
            <button type="button" className="st-btn st-btn--ghost st-btn--small" disabled={saving} onClick={() => void openCopy()}>
              کپی از هفته‌ی قبل
            </button>
          )}
          {(["day", "week", "month"] as View[]).map((v) => (
            <button key={v} type="button" className={`st-btn st-btn--small ${view === v ? "" : "st-btn--ghost"}`} onClick={() => setView(v)}>
              {v === "day" ? "روزانه" : v === "week" ? "هفتگی" : "ماهانه"}
            </button>
          ))}
        </div>
      </div>

      <Legend />

      {view === "day" ? (
        <div className="sh-day-cols">
          {TEAM_SHIFT_TYPES.map((t) => {
            const m = SHIFT_META[t];
            const people = visibleStaff.filter((s) => typeAt(s.id, anchor) === t);

            return (
              <div key={t} className="sh-day-col" style={{ background: m.bg, borderColor: m.color }}>
                <h3 style={{ color: m.color }}>
                  <span>{m.label} {m.start ? <bdi dir="ltr" style={{ fontWeight: 600 }}>{m.start}–{m.end}</bdi> : ""}</span>
                  <span>{fa(people.length)}</span>
                </h3>
                {people.length === 0 ? (
                  <div className="sh-none">—</div>
                ) : (
                  <ul>
                    {people.map((s) => (
                      <li key={s.id}>
                        {edit ? (
                          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => setEditor({ staff: s, date: anchor })}>
                            {s.name}
                          </button>
                        ) : (
                          s.name
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="sh-day-col" style={{ gridColumn: "1 / -1", background: "#f6f9fc", borderColor: "#d3e0ed" }}>
            <h3>
              <span>بدون شیفت در این روز</span>
              <span>{fa(visibleStaff.filter((s) => !typeAt(s.id, anchor)).length)}</span>
            </h3>
            <ul style={{ flexDirection: "row", flexWrap: "wrap", gap: "6px 14px" }}>
              {visibleStaff.filter((s) => !typeAt(s.id, anchor)).map((s) => (
                <li key={s.id}>
                  {edit ? (
                    <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => setEditor({ staff: s, date: anchor })}>
                      {s.name}
                    </button>
                  ) : (
                    s.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="st-field" style={{ maxWidth: 260 }}>
            <input className="st-input" placeholder="جستجوی پرسنل..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="sh-matrix-wrap">
            <table className={`sh-matrix ${view === "month" ? "sh-matrix--month" : ""}`}>
              <thead>
                <tr>
                  <th className="sh-name">پرسنل</th>
                  {dates.map((d) => (
                    <th key={d} className={`${weekdayIndex(d) === 6 ? "sh-fri" : ""} ${d === today ? "sh-today" : ""}`}>
                      {WEEKDAY_SHORT[weekdayIndex(d)]}
                      <small>{toJalali(d).jd.toLocaleString("fa-IR")}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStaff.map((s) => (
                  <tr key={s.id}>
                    <td className="sh-name" title={s.name}>{s.name}</td>
                    {dates.map((d) => {
                      const type = typeAt(s.id, d);

                      return (
                        <td key={d} className={weekdayIndex(d) === 6 ? "sh-fri" : ""}>
                          {edit ? (
                            <button type="button" className="sh-cell" onClick={() => setEditor({ staff: s, date: d })}>
                              <ShiftChip type={type} compact />
                            </button>
                          ) : (
                            <div className="sh-cell">
                              <ShiftChip type={type} compact />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sh-name">شاغل در روز</td>
                  {dates.map((d) => (
                    <td key={d}>{fa(visibleStaff.filter((s) => { const t = typeAt(s.id, d); return t && t !== "LEAVE" && t !== "ABSENT"; }).length)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {copyInfo && (
        <div className="sh-editor-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCopyInfo(null); }}>
          <div className="sh-editor" role="dialog" aria-modal="true">
            <h3>کپی از هفته‌ی قبل</h3>
            <p>
              {fa(copyInfo.sourceCount)} شیفت از هفته‌ی قبل به {title} کپی می‌شود.
              {copyInfo.targetCount > 0 && ` در این هفته ${fa(copyInfo.targetCount)} شیفت از قبل ثبت شده است.`}
            </p>

            <div className="sh-editor__options">
              {copyInfo.targetCount > 0 ? (
                <>
                  <button type="button" disabled={saving} style={{ background: "#e1efff", color: "#1d6fd1", borderColor: "#1d6fd1" }} onClick={() => void doCopy("fill")}>
                    فقط خانه‌های خالی
                  </button>
                  <button type="button" disabled={saving} style={{ background: "#fee4e2", color: "#b42318", borderColor: "#b42318" }} onClick={() => void doCopy("replace")}>
                    جایگزینی کامل
                  </button>
                </>
              ) : (
                <button type="button" disabled={saving} style={{ background: "#def5e8", color: "#1b8a4b", borderColor: "#1b8a4b", gridColumn: "1 / -1" }} onClick={() => void doCopy("fill")}>
                  کپی شیفت‌ها
                </button>
              )}

              <button type="button" className="st-btn st-btn--ghost" style={{ gridColumn: "1 / -1" }} onClick={() => setCopyInfo(null)}>
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {editor && (
        <div className="sh-editor-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditor(null); }}>
          <div className="sh-editor" role="dialog" aria-modal="true">
            <h3>{editor.staff.name}</h3>
            <p>{formatJalali(editor.date, true)}</p>

            <div className="sh-editor__options">
              {TEAM_SHIFT_TYPES.map((t) => {
                const m = SHIFT_META[t];

                return (
                  <button
                    key={t}
                    type="button"
                    disabled={saving}
                    style={{ background: m.bg, color: m.color, borderColor: m.color }}
                    onClick={() => setCell(editor.staff.id, editor.date, t)}
                  >
                    {m.label}
                    {shiftRangeText(t) && <small dir="ltr">{shiftRangeText(t)}</small>}
                  </button>
                );
              })}

              <button type="button" disabled={saving} style={{ background: "#f4f6f8", color: "#5d7084", borderColor: "#c9d3de" }} onClick={() => setCell(editor.staff.id, editor.date, null)}>
                خالی (حذف شیفت)
              </button>

              <button type="button" className="st-btn st-btn--ghost" onClick={() => setEditor(null)}>
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </CrudCard>
  );
}
