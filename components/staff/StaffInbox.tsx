"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

type Item = { id: number; status: string; task: { title: string; dueDate: string | null } };
type LeaveItem = {
  id: number;
  user: { id: number; name: string };
  type: string;
  startDate: string;
  endDate: string;
  status: string;
};
const leaveTypeLabels: Record<string, string> = {
  DAILY: "روزانه", HOURLY: "ساعتی", ANNUAL: "استحقاقی",
  SICK: "استعلاجی", UNPAID: "بدون حقوق", OTHER: "سایر",
};
const leaveStatusLabels: Record<string, { text: string; color: string }> = {
  PENDING_SUPERVISOR: { text: "در انتظار سوپروایزر", color: "#b45309" },
  PENDING_MANAGER: { text: "در انتظار مدیر", color: "#b45309" },
  APPROVED: { text: "تأیید شد", color: "#15803d" },
  REJECTED: { text: "رد شد", color: "#b91c1c" },
  CANCELLED: { text: "لغو شد", color: "#64748b" },
};
export default function StaffInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveItem[]>([]);
  const [leaveCount, setLeaveCount] = useState(0);
  const [swapCount, setSwapCount] = useState(0);
  const [approvalError, setApprovalError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/tasks", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/leaves?scope=approvals", { cache: "no-store" }).then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) return { __error: data?.error || `خطای دریافت کارتابل مرخصی (HTTP ${r.status})`, __status: r.status };
        return data;
      }).catch(() => ({ __error: "ارتباط با سرویس کارتابل مرخصی برقرار نشد" })),
      fetch("/api/shifts/swaps?scope=approvals", { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/leaves?scope=mine", { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([tasks, leaveRows, swaps, mineRows]) => {
      if (!active) return;
      setMyLeaves(Array.isArray(mineRows) ? mineRows.slice(0, 5) : []);
      setItems((tasks?.assignments ?? []).filter((a: Item) => a.status !== "DONE").slice(0, 5));
      const leaveResponse = leaveRows as LeaveItem[] | { __error?: string; __status?: number };
      if (!Array.isArray(leaveResponse)) {
        // ۴۰۳ یعنی این کاربر تأییدکننده نیست؛ خطا نیست
        setApprovalError(leaveResponse?.__status === 403 ? "" : leaveResponse?.__error || "دریافت درخواست‌های مرخصی ناموفق بود");
        setLeaves([]);
        setLeaveCount(0);
      } else {
        setApprovalError("");
        setLeaves(leaveResponse.slice(0, 5));
        setLeaveCount(leaveResponse.length);
      }
      setSwapCount(Array.isArray(swaps) ? swaps.length : 0);
    });
    return () => { active = false; };
  }, []);
  return <section style={{ margin: "22px 0", padding: 20, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" }} dir="rtl">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h2 style={{ margin: 0, color: "#123E73", fontSize: 20 }}>کارتابل پرسنلی</h2><p style={{ margin: "6px 0 0", color: "#64748b" }}>تسک‌ها و درخواست‌های قابل پیگیری شما</p></div><Link href="/admin/tasks" style={{ color: "#155eab", fontWeight: 700 }}>مشاهده همه تسک‌ها ←</Link></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
      <Link href="/admin/tasks" style={tile}><strong>{items.length}</strong><span>تسک باز</span></Link>
      <Link href="/admin/leaves" style={tile}><strong>{leaveCount}</strong><span>مرخصی در انتظار بررسی</span></Link>
      <Link href="/admin/shifts" style={tile}><strong>{swapCount}</strong><span>تغییر شیفت در انتظار بررسی</span></Link>
    </div>
    {approvalError && <div role="alert" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}>
      دریافت کارتابل مرخصی با خطا مواجه شد: {approvalError}. دسترسی نقش سوپروایزر و تنظیمات کاربر را بررسی کنید.
    </div>}
    {items.length > 0 && <ul style={{ margin: "14px 0 0", paddingRight: 20, color: "#334155" }}>{items.map(i => <li key={i.id} style={{ padding: "4px 0" }}>{i.task.title}</li>)}</ul>}
    {myLeaves.length > 0 && <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "#123E73" }}>درخواست‌های مرخصی من</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {myLeaves.map(leave => {
          const st = leaveStatusLabels[leave.status] ?? { text: leave.status, color: "#334155" };
          return <Link key={leave.id} href="/admin/leaves" style={leaveRow}>
            <span>{leaveTypeLabels[leave.type] ?? leave.type}</span>
            <span>{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} تا ${leave.endDate}`}</span>
            <span style={{ color: st.color, fontWeight: 700 }}>{st.text}</span>
          </Link>;
        })}
      </div>
    </div>}
    {leaves.length > 0 && <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "#123E73" }}>درخواست‌های مرخصی برای بررسی</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {leaves.map(leave => <Link key={leave.id} href="/admin/leaves" style={leaveRow}>
          <span style={{ fontWeight: 700 }}>{leave.user.name}</span>
          <span>{leaveTypeLabels[leave.type] ?? leave.type}</span>
          <span>{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} تا ${leave.endDate}`}</span>
          <span style={{ color: "#155eab", fontWeight: 700 }}>بررسی درخواست ←</span>
        </Link>)}
      </div>
    </div>}
  </section>;
}
const leaveRow: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", textDecoration: "none" };
const tile: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", textDecoration: "none" };
