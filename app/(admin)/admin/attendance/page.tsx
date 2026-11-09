"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CrudCard, CrudPage } from "@/components/admin/crud/CrudPage";
import ShiftChip from "@/components/staff/ShiftChip";
import "@/components/staff/staff.css";
import { formatMinutes, type DayResult, type MonthSummary } from "@/lib/attendance";
import { nowInTehran } from "@/lib/availability";
import { fa } from "@/lib/format";
import { JALALI_MONTHS, jalaliShort, toJalali, weekdayIndex, WEEKDAY_NAMES } from "@/lib/jalali";
import { useStaffMe } from "@/lib/use-staff-me";

type Row = {
  user: { id: number; name: string; role: string; deviceCode: string | null };
  summary: MonthSummary;
  days?: DayResult[];
};

const STATUS: Record<string, [string, string]> = {
  PRESENT: ["حاضر", "st-badge--ok"],
  INCOMPLETE: ["ناقص (تردد ثبت نشده)", "st-badge--pending"],
  ABSENT: ["غایب", "st-badge--bad"],
  LEAVE: ["مرخصی", "st-badge--pending"],
  OFF: ["بدون شیفت", "st-badge--muted"],
  UNSCHEDULED: ["حضور بدون شیفت", "st-badge--pending"],
  PENDING: ["هنوز نرسیده", "st-badge--muted"],
  FUTURE: ["—", "st-badge--muted"],
};

const hm = (t: string | null) => (t ? t.slice(0, 5) : "—");
const mins = (m: number) => (m ? formatMinutes(m) : "—");

export default function AttendancePage() {
  const { me, can, loaded } = useStaffMe();
  const todayJ = toJalali(nowInTehran().date);
  const [jy, setJy] = useState(todayJ.jy);
  const [jm, setJm] = useState(todayJ.jm);
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const viewAll = !!can?.attendanceView;

  const load = useCallback(
    async (userId?: number) => {
      setLoading(true);
      setError("");

      try {
        const q = new URLSearchParams({ year: String(jy), month: String(jm) });

        if (userId) q.set("userId", String(userId));

        const r = await fetch(`/api/attendance/summary?${q}`, { cache: "no-store" });
        const d = await r.json();

        if (!r.ok) throw new Error(d.error || "خطا در دریافت اطلاعات");

        if (userId) setDetail(d.row);
        else setRows(d.rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا");
      } finally {
        setLoading(false);
      }
    },
    [jy, jm]
  );

  useEffect(() => {
    if (!loaded) return;

    if (viewAll && !detail) void load();
    else if (detail) void load(detail.user.id);
    else if (me?.id) void load(me.id);
  }, [loaded, viewAll, me?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = detail?.summary;

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="کارکرد و حضور و غیاب"
      description="ساعت کارکرد، تأخیر، غیبت و اضافه‌کار بر اساس شیفت و تردد دستگاه"
      headerAction={
        can?.attendanceManage ? (
          <Link href="/admin/attendance/device" className="st-btn st-btn--ghost">
            دستگاه و ورود اطلاعات
          </Link>
        ) : undefined
      }
    >
      {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}

      <div className="st-toolbar">
        <div className="st-nav">
          <select className="st-select" value={jm} onChange={(e) => setJm(Number(e.target.value))} aria-label="ماه">
            {JALALI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="st-select" value={jy} onChange={(e) => setJy(Number(e.target.value))} aria-label="سال">
            {[todayJ.jy - 1, todayJ.jy, todayJ.jy + 1].map((y) => (
              <option key={y} value={y}>{y.toLocaleString("fa-IR", { useGrouping: false })}</option>
            ))}
          </select>
        </div>

        {detail && viewAll && (
          <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => { setDetail(null); void load(); }}>
            ← بازگشت به فهرست پرسنل
          </button>
        )}
      </div>

      {viewAll && !detail ? (
        <CrudCard title="خلاصه‌ی کارکرد پرسنل" description="برای دیدن ریز روزانه روی نام هر نفر بزنید.">
          {loading ? (
            <div className="st-empty">در حال دریافت...</div>
          ) : rows.length === 0 ? (
            <div className="st-empty">پرسنلی پیدا نشد.</div>
          ) : (
            <div className="crud-table-wrap">
              <table className="crud-table">
                <thead>
                  <tr>
                    <th>پرسنل</th>
                    <th>سمت </th>
                    <th>AM</th>
                    <th>PM</th>
                    <th>Full</th>
                    <th>OFF</th>
                    <th>جمع ساعات شیفت</th>
                    {/* <th>روز حضور</th>
                    <th>غیبت</th>
                    <th>مرخصی</th>
                    <th>تأخیر (روز / ساعت)</th>
                    <th>کارکرد</th>
                    <th>اضافه‌کار</th>
                    <th>ناقص</th> */}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user.id}>
                      <td>
                        <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => { setDetail(r); void load(r.user.id); }}>
                          {r.user.name}
                        </button>
                      </td>
                      <td >{r.user.role }</td>
                      <td>{r.summary.shiftAm ? fa(r.summary.shiftAm) : "—"}</td>
                      <td>{r.summary.shiftPm ? fa(r.summary.shiftPm) : "—"}</td>
                      <td>{r.summary.shiftFull ? fa(r.summary.shiftFull) : "—"}</td>
                      <td>{r.summary.shiftOff ? fa(r.summary.shiftOff) : "—"}</td>
                      <td><b>{mins(r.summary.scheduledMinutes)}</b></td>
                      {/* <td>{fa(r.summary.presentDays)}</td>
                      <td>{r.summary.absentDays ? <span className="st-badge st-badge--bad">{fa(r.summary.absentDays)}</span> : "—"}</td>
                      <td>{fa(r.summary.leaveDays)}</td>
                      <td>{r.summary.lateDays ? `${fa(r.summary.lateDays)} / ${mins(r.summary.lateMinutes)}` : "—"}</td>
                      <td>{mins(r.summary.workedMinutes)}</td>
                      <td>{mins(r.summary.overtimeMinutes)}</td>
                      <td>{r.summary.incompleteDays ? fa(r.summary.incompleteDays) : "—"}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CrudCard>
      ) : detail ? (
        <CrudCard
          title={`ریز کارکرد ${detail.user.name}`}
          description={detail.user.deviceCode ? `کد دستگاه: ${detail.user.deviceCode}` : "برای این فرد کد دستگاه ثبت نشده است؛ تردد او شناسایی نمی‌شود."}
        >
          {s && (
            <div className="st-legend" style={{ gap: "8px 22px" }}>
              <span>AM: <b>{fa(s.shiftAm)}</b></span>
              <span>PM: <b>{fa(s.shiftPm)}</b></span>
              <span>Full: <b>{fa(s.shiftFull)}</b></span>
              <span>OFF: <b>{fa(s.shiftOff)}</b></span>
              <span>جمع ساعات شیفت: <b>{mins(s.scheduledMinutes)}</b></span>
              <span>روز حضور: <b>{fa(s.presentDays)}</b></span>
              <span>غیبت: <b>{fa(s.absentDays)}</b></span>
              <span>مرخصی: <b>{fa(s.leaveDays)}</b></span>
              <span>کارکرد: <b>{mins(s.workedMinutes)}</b></span>
              <span>تأخیر: <b>{mins(s.lateMinutes)}</b></span>
              <span>اضافه‌کار: <b>{mins(s.overtimeMinutes)}</b></span>
            </div>
          )}

          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>شیفت</th>
                  <th>ورود</th>
                  <th>خروج</th>
                  <th>کارکرد</th>
                  <th>تأخیر</th>
                  <th>تعجیل</th>
                  <th>اضافه‌کار</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {(detail.days ?? []).map((d) => {
                  const [baseLabel, cls] = STATUS[d.status] ?? [d.status, ""];
                  const label = d.status === "ABSENT" && d.shift === "ABSENT" ? "OFF" : baseLabel;

                  return (
                    <tr key={d.date}>
                      <td>
                        {WEEKDAY_NAMES[weekdayIndex(d.date)]} {jalaliShort(d.date)}
                      </td>
                      <td><ShiftChip type={d.shift} compact /></td>
                      <td dir="ltr">{hm(d.firstIn)}</td>
                      <td dir="ltr">{hm(d.lastOut)}</td>
                      <td>{mins(d.workedMinutes)}</td>
                      <td>{mins(d.lateMinutes)}</td>
                      <td>{mins(d.earlyLeaveMinutes)}</td>
                      <td>{mins(d.overtimeMinutes)}</td>
                      <td><span className={`st-badge ${cls}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="st-note" style={{ marginTop: 12 }}>
            تأخیر و تعجیل بیش از ۱۰ دقیقه و اضافه‌کار بیش از ۱۵ دقیقه محاسبه می‌شود. ترددهای کمتر از ۲ دقیقه از هم یک تردد حساب می‌شوند.
          </p>
        </CrudCard>
      ) : (
        <div className="st-empty">در حال دریافت...</div>
      )}
    </CrudPage>
  );
}
