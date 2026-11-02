"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";

import { CrudCard, CrudPage } from "@/components/admin/crud/CrudPage";
import "@/components/staff/staff.css";
import { fa } from "@/lib/format";

type Device = { id: number; name: string; isActive: boolean; lastSeenAt: string | null; logCount: number };
type Unmapped = { code: string; count: number; lastDate: string | null };
type ImportResult = {
  parsed: number;
  inserted: number;
  duplicates: number;
  errorCount: number;
  errors: { line: number; text: string; reason: string }[];
  unmapped: Unmapped[];
};

export default function AttendanceDevicePage() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const [devices, setDevices] = useState<Device[]>([]);
  const [unmapped, setUnmapped] = useState<Unmapped[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [shownKey, setShownKey] = useState<{ name: string; key: string } | null>(null);

  const [deviceId, setDeviceId] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const load = useCallback(async () => {
    const [d, u] = await Promise.all([
      fetch("/api/attendance/devices", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/attendance/unmapped", { cache: "no-store" }).then((r) => r.json()),
    ]);

    if (Array.isArray(d)) setDevices(d);
    if (Array.isArray(u)) setUnmapped(u);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(url: string, method: string, body?: unknown) {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const d = await r.json();

    if (!r.ok) throw new Error(d.error || "خطا");

    return d;
  }

  async function addDevice(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setBusy(true);

      const d = await call("/api/attendance/devices", "POST", { name });

      setShownKey({ name: d.device.name, key: d.key });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function patchDevice(id: number, body: Record<string, unknown>, label: string) {
    setError("");
    setSuccess("");

    try {
      const d = await call("/api/attendance/devices", "PATCH", { id, ...body });

      if (d.key) setShownKey({ name: d.device.name, key: d.key });
      else setSuccess(label);

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  async function removeDevice(device: Device) {
    if (!await confirmDialog(`دستگاه «${device.name}» حذف شود؟ ترددهای ثبت‌شده حفظ می‌شود.`)) return;

    try {
      await call("/api/attendance/devices", "DELETE", { id: device.id });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => setText(String(reader.result ?? ""));
    reader.onerror = () => setError("خواندن فایل ممکن نشد");
    reader.readAsText(file);
  }

  async function runImport(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    try {
      setBusy(true);

      const d: ImportResult = await call("/api/attendance/import", "POST", { text, deviceId: deviceId || null });

      setResult(d);
      setUnmapped(d.unmapped ?? []);
      setSuccess(`${fa(d.inserted)} تردد جدید ثبت شد.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="دستگاه حضور و غیاب"
      description="ثبت دستگاه، ورود فایل تردد و تطبیق کد پرسنل"
    >
      {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}
      {success && <div className="st-alert st-alert--ok" role="status">{success}</div>}

      <CrudCard title="ورود فایل تردد" description="خروجی دستگاه (CSV / TXT / DAT) را انتخاب کنید یا متن را مستقیم بچسبانید. ورود دوباره‌ی همان فایل، ترددهای تکراری ایجاد نمی‌کند.">
        <form onSubmit={runImport}>
          <div className="st-row">
            <div className="st-field">
              <label>فایل</label>
              <input className="st-input" type="file" accept=".csv,.txt,.dat,.log,text/*" onChange={onFile} style={{ paddingTop: 9 }} />
              {fileName && <small>{fileName}</small>}
            </div>

            <div className="st-field">
              <label>دستگاه (اختیاری)</label>
              <select className="st-select" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                <option value="">بدون انتخاب</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="st-field">
            <label>یا متن تردد</label>
            <textarea
              className="st-textarea"
              style={{ minHeight: 120, direction: "ltr", fontFamily: "monospace", fontSize: 12 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"12,2026-10-21 10:03:12\n12,2026-10-21 16:50:40\n7;1405/07/29;10:01"}
            />
            <small>هر خط: کد کاربر + تاریخ + ساعت. تاریخ شمسی یا میلادی. ساعت دستگاه همان ساعت محلی است.</small>
          </div>

          <button type="submit" className="st-btn" disabled={busy || !text.trim()}>
            {busy ? "در حال ورود اطلاعات..." : "ورود اطلاعات"}
          </button>
        </form>

        {result && (
          <div className="st-note" style={{ marginTop: 14 }}>
            خوانده‌شده: {fa(result.parsed)} · جدید: {fa(result.inserted)} · تکراری: {fa(result.duplicates)} · خط‌های نامعتبر: {fa(result.errorCount)}
            {result.errors.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingRight: 18 }}>
                {result.errors.map((e) => (
                  <li key={e.line}>
                    خط {fa(e.line)}: {e.reason} <bdi dir="ltr">({e.text})</bdi>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CrudCard>

      <div style={{ height: 18 }} />

      <CrudCard
        title="کدهای بدون پرسنل"
        description="این کدها در ترددها هست ولی به هیچ پرسنلی وصل نیست. کد را در صفحه‌ی «کاربران» (فیلد «کد دستگاه») برای فرد مربوطه ثبت کنید؛ ترددهای قبلی هم خودکار شناسایی می‌شود."
      >
        {unmapped.length === 0 ? (
          <div className="st-empty">همه‌ی کدها به پرسنل وصل هستند.</div>
        ) : (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>کد در دستگاه</th>
                  <th>تعداد تردد</th>
                  <th>آخرین تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((u) => (
                  <tr key={u.code}>
                    <td dir="ltr">{u.code}</td>
                    <td>{fa(u.count)}</td>
                    <td dir="ltr">{u.lastDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CrudCard>

      <div style={{ height: 18 }} />

      <CrudCard title="دستگاه‌ها و ارسال خودکار" description="اگر دستگاه یا نرم‌افزار واسط بتواند درخواست HTTP بفرستد، ترددها خودکار ثبت می‌شود.">
        {shownKey && (
          <div className="st-alert st-alert--ok">
            کلید دستگاه «{shownKey.name}» (فقط همین یک بار نمایش داده می‌شود — آن را جای امنی ذخیره کنید):
            <div dir="ltr" style={{ marginTop: 6, fontFamily: "monospace", wordBreak: "break-all", userSelect: "all" }}>{shownKey.key}</div>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="st-empty">هنوز دستگاهی ثبت نشده است.</div>
        ) : (
          <div className="st-card-list">
            {devices.map((d) => (
              <article key={d.id} className="st-item">
                <header>
                  <div>
                    <strong>{d.name}</strong>
                    <small>
                      {fa(d.logCount)} تردد · آخرین ارتباط: {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("fa-IR") : "—"}
                    </small>
                  </div>
                  <span className={`st-badge ${d.isActive ? "st-badge--ok" : "st-badge--muted"}`}>{d.isActive ? "فعال" : "غیرفعال"}</span>
                </header>

                <div className="st-actions">
                  <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={() => patchDevice(d.id, { isActive: !d.isActive }, d.isActive ? "دستگاه غیرفعال شد." : "دستگاه فعال شد.")}>
                    {d.isActive ? "غیرفعال کردن" : "فعال کردن"}
                  </button>
                  <button type="button" className="st-btn st-btn--ghost st-btn--small" onClick={async () => (await confirmDialog("کلید قبلی از کار می‌افتد. ادامه می‌دهید؟")) && patchDevice(d.id, { rotateKey: true }, "")}>
                    کلید جدید
                  </button>
                  <button type="button" className="st-btn st-btn--danger st-btn--small" onClick={() => removeDevice(d)}>
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <form onSubmit={addDevice} style={{ marginTop: 16 }}>
          <div className="st-row">
            <div className="st-field">
              <label>نام دستگاه جدید</label>
              <input className="st-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً ورودی اصلی" required maxLength={60} />
            </div>
          </div>
          <button type="submit" className="st-btn" disabled={busy}>افزودن دستگاه</button>
        </form>

        <div className="st-note" style={{ marginTop: 16, direction: "ltr", textAlign: "left", fontFamily: "monospace", fontSize: 12 }}>
          POST /api/attendance/punch<br />
          x-device-key: &lt;device key&gt;<br />
          {`{ "records": [ { "code": "12", "datetime": "2026-10-21 10:03:12" } ] }`}
        </div>
      </CrudCard>
    </CrudPage>
  );
}
