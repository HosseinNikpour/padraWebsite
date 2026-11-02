"use client";

import { useCallback, useEffect, useState } from "react";

import { CrudCard } from "@/components/admin/crud/CrudPage";
import { formatJalali } from "@/lib/jalali";
import { SHIFT_META, shiftRangeText, type ShiftType } from "@/lib/shifts";

type Swap = {
  id: number;
  requester: { id: number; name: string };
  date: string;
  currentType: string;
  requestedType: string;
  replacement: { id: number; name: string } | null;
  reason: string | null;
};

const txt = (t: string) => `${SHIFT_META[t as ShiftType]?.label ?? t} ${shiftRangeText(t as ShiftType)}`.trim();

export default function SwapApprovals({ onChange }: { onChange?: (count: number) => void }) {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/shifts/swaps?scope=approvals", { cache: "no-store" });
    const d = await r.json();

    if (!r.ok) {
      setError(d.error || "خطا در دریافت درخواست‌ها");
      return;
    }

    setSwaps(d);
    onChange?.(d.length);
  }, [onChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: number, action: "approve" | "reject") {
    setError("");
    setSuccess("");

    try {
      setBusy(true);

      const r = await fetch(`/api/shifts/swaps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "خطا");

      setSuccess(action === "approve" ? "جابه‌جایی تأیید و در تقویم اعمال شد." : "درخواست رد شد.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrudCard title="درخواست‌های جابه‌جایی شیفت" description="با تأیید، شیفت درخواست‌دهنده و جایگزین در تقویم به‌روز می‌شود.">
      {error && <div className="st-alert st-alert--error" role="alert">{error}</div>}
      {success && <div className="st-alert st-alert--ok" role="status">{success}</div>}

      {swaps.length === 0 ? (
        <div className="st-empty">درخواستی در انتظار تأیید نیست.</div>
      ) : (
        <div className="st-card-list">
          {swaps.map((s) => (
            <article key={s.id} className="st-item">
              <header>
                <div>
                  <strong>{s.requester.name}</strong>
                  <small>{formatJalali(s.date, true)}</small>
                </div>
              </header>

              <dl>
                <div>
                  <dt>شیفت فعلی</dt>
                  <dd><bdi>{txt(s.currentType)}</bdi></dd>
                </div>
                <div>
                  <dt>تغییر به</dt>
                  <dd><bdi>{txt(s.requestedType)}</bdi></dd>
                </div>
                <div>
                  <dt>جایگزین</dt>
                  <dd>{s.replacement?.name ?? "—"}</dd>
                </div>
              </dl>

              {s.reason && <div className="st-note">{s.reason}</div>}

              <input
                className="st-input"
                placeholder="یادداشت (اختیاری)"
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                maxLength={500}
              />

              <div className="st-actions">
                <button type="button" className="st-btn st-btn--ok st-btn--small" disabled={busy} onClick={() => act(s.id, "approve")}>تأیید</button>
                <button type="button" className="st-btn st-btn--danger st-btn--small" disabled={busy} onClick={() => act(s.id, "reject")}>رد</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </CrudCard>
  );
}
