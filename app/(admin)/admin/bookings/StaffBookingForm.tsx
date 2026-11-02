"use client";

import { useEffect, useState, type FormEvent } from "react";

import { CrudCard, CrudField } from "@/components/admin/crud/CrudPage";
import { useFeedback } from "@/components/ui/Feedback";
import JalaliDateSelect from "@/components/staff/JalaliDateSelect";
import "@/components/staff/staff.css";
import { nowInTehran } from "@/lib/availability";

type Option = { id: number; name: string };
type Slot = {
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  remaining: number;
  status: "available" | "full" | "past";
};

/** ثبت رزرو حضوری توسط پرسنل: بدون پرداخت، با توضیحات؛ ظرفیت نوبت بلافاصله کم می‌شود. */
export default function StaffBookingForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<Option[]>([]);
  const [events, setEvents] = useState<Option[]>([]);

  const [type, setType] = useState<"game" | "event">("game");
  const [targetId, setTargetId] = useState("");
  const [date, setDate] = useState(() => nowInTehran().date);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || games.length || events.length) return;

    fetch("/api/bookings/staff", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGames(d.games ?? []);
        setEvents(d.events ?? []);
      })
      .catch(() => setError("دریافت فهرست بازی‌ها و ایونت‌ها ممکن نشد"));
  }, [open, games.length, events.length]);

  useEffect(() => {
    setStartTime("");
    setSlots([]);

    if (!open || !targetId || !date) return;

    let active = true;

    setSlotsLoading(true);
    fetch(`/api/availability/slots?type=${type}&id=${targetId}&date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => active && setSlots(Array.isArray(d.slots) ? d.slots : []))
      .catch(() => active && setSlots([]))
      .finally(() => active && setSlotsLoading(false));

    return () => {
      active = false;
    };
  }, [open, type, targetId, date]);

  const selected = slots.find((s) => s.startTime === startTime);
  const list = type === "game" ? games : events;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!targetId || !startTime) return setError("بازی/ایونت و نوبت را انتخاب کنید");

    try {
      setBusy(true);

      const response = await fetch("/api/bookings/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: Number(targetId), date, startTime, quantity, customerName, customerPhone, note }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "خطا در ثبت رزرو");

      toast("رزرو حضوری ثبت شد و از ظرفیت نوبت کم شد", "success");
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setQuantity(1);
      setStartTime("");
      onCreated();

      // ظرفیت جدید نوبت‌ها
      const refreshed = await fetch(`/api/availability/slots?type=${type}&id=${targetId}&date=${date}`, { cache: "no-store" }).then((r) => r.json());

      setSlots(Array.isArray(refreshed.slots) ? refreshed.slots : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت رزرو");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="crud-form-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="crud-button" onClick={() => setOpen(true)}>
          + ثبت رزرو حضوری
        </button>
      </div>
    );
  }

  return (
    <CrudCard title="ثبت رزرو حضوری" description="برای مشتری‌هایی که حضوری مراجعه کرده‌اند. پرداخت آنلاین ندارد و ظرفیت نوبت بلافاصله کم می‌شود. توضیحات اختیاری است.">
      <form onSubmit={submit}>
        <div className="crud-form-grid">
          <CrudField label="نوع">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as "game" | "event");
                setTargetId("");
              }}
            >
              <option value="game">بازی</option>
              <option value="event">ایونت</option>
            </select>
          </CrudField>

          <CrudField label={type === "game" ? "بازی" : "ایونت"}>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">انتخاب کنید</option>
              {list.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </CrudField>

          <CrudField label="تاریخ (شمسی)">
            <JalaliDateSelect value={date} onChange={setDate} yearsBefore={0} yearsAfter={1} />
          </CrudField>

          <CrudField label="نوبت">
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!slots.length}>
              <option value="">{slotsLoading ? "در حال دریافت..." : slots.length ? "انتخاب کنید" : "نوبتی وجود ندارد"}</option>
              {slots.map((slot) => (
                <option key={slot.startTime} value={slot.startTime} disabled={slot.remaining <= 0}>
                  {slot.startTime} – {slot.endTime} ({slot.remaining.toLocaleString("fa-IR")} جای خالی از {slot.capacity.toLocaleString("fa-IR")})
                </option>
              ))}
            </select>
          </CrudField>

          <CrudField label="تعداد نفرات">
            <input
              type="number"
              min={1}
              max={selected ? Math.max(1, selected.remaining) : undefined}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              dir="ltr"
            />
          </CrudField>

          <CrudField label="نام مشتری (اختیاری)">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={100} />
          </CrudField>

          <CrudField label="موبایل (اختیاری)">
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="09123456789" />
          </CrudField>
        </div>

        <CrudField label="توضیحات (اختیاری)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="مثلاً: پرداخت نقدی در کافه، همراه با یک کودک ۵ ساله"
          />
        </CrudField>

        {selected && (
          <p style={{ margin: "8px 0" }}>
            ظرفیت این نوبت: {selected.capacity.toLocaleString("fa-IR")} نفر · رزرو شده: {selected.booked.toLocaleString("fa-IR")} · جای خالی:{" "}
            <strong>{selected.remaining.toLocaleString("fa-IR")}</strong>
            {quantity <= selected.remaining && <> · بعد از ثبت: <strong>{(selected.remaining - quantity).toLocaleString("fa-IR")}</strong></>}
          </p>
        )}

        {error && (
          <div className="crud-alert crud-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="crud-form-actions">
          <button type="submit" className="crud-button" disabled={busy}>
            {busy ? "در حال ثبت..." : "ثبت رزرو"}
          </button>
          <button type="button" className="crud-button crud-button--secondary" onClick={() => setOpen(false)}>
            بستن
          </button>
        </div>
      </form>
    </CrudCard>
  );
}
