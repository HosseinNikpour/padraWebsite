"use client";
import { FormEvent, useState } from "react";
import "@/components/staff/staff.css";
export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    if (next !== confirm) { setMessage({ ok: false, text: "تکرار رمز جدید با رمز جدید یکی نیست" }); return; }
    try {
      setSaving(true);
      const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await response.json();
      if (!response.ok) { setMessage({ ok: false, text: data.error || "خطا در تغییر رمز" }); return; }
      setCurrent(""); setNext(""); setConfirm(""); setMessage({ ok: true, text: "رمز عبور با موفقیت تغییر کرد." });
    } catch { setMessage({ ok: false, text: "ارتباط با سرور برقرار نشد" }); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit}>
    <div className="st-field"><label>رمز فعلی</label><input className="st-input" type="password" value={current} onChange={e => setCurrent(e.target.value)} dir="ltr" autoComplete="current-password" required /></div>
    <div className="st-field"><label>رمز جدید</label><input className="st-input" type="password" value={next} onChange={e => setNext(e.target.value)} dir="ltr" minLength={8} autoComplete="new-password" required /></div>
    <div className="st-field"><label>تکرار رمز جدید</label><input className="st-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" minLength={8} autoComplete="new-password" required /></div>
    {message && <div className={`st-alert ${message.ok ? "st-alert--ok" : "st-alert--error"}`} role="status">{message.text}</div>}
    <button type="submit" className="st-btn" disabled={saving}>{saving ? "در حال ذخیره..." : "تغییر رمز"}</button>
  </form>;
}
