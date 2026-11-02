"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrudCard, CrudField, CrudPage } from "@/components/admin/crud/CrudPage";
import { WEEKDAYS, generateSlots, validateRules, type Rule, type TimeRange } from "@/lib/availability";
import { fa } from "@/lib/format";
import "./availability.css";

type TargetType = "game" | "event";
type Settings = { durationMinutes: number; gapMinutes: number; minPlayers: number; maxPlayers: number; capacity: number; price: number };
type Item = { type: TargetType; id: number; name: string; isActive: boolean; settings: Settings; rules: Rule[] };
type DayConfig = Settings & { ranges: TimeRange[] };
type WeekConfig = Record<number, DayConfig>;
const defaults: Settings = { durationMinutes: 20, gapMinutes: 10, minPlayers: 1, maxPlayers: 10, capacity: 10, price: 0 };

function toWeek(rules: Rule[], fallback: Settings): WeekConfig {
  const week = {} as WeekConfig;
  for (const day of WEEKDAYS) {
    const dayRules = rules.filter((r) => r.weekday === day.value);
    const first = dayRules[0];
    week[day.value] = {
      durationMinutes: first?.durationMinutes ?? fallback.durationMinutes,
      gapMinutes: first?.gapMinutes ?? fallback.gapMinutes,
      minPlayers: first?.minPlayers ?? fallback.minPlayers,
      maxPlayers: first?.maxPlayers ?? fallback.maxPlayers,
      capacity: first?.capacity ?? fallback.capacity ?? fallback.maxPlayers,
      price: first?.price ?? fallback.price,
      ranges: dayRules.map(({ startTime, endTime }) => ({ startTime, endTime })),
    };
  }
  return week;
}
function toRules(week: WeekConfig): Rule[] {
  return WEEKDAYS.flatMap((day) => {
    const config = week[day.value];
    return config.ranges.map((range) => ({
      weekday: day.value, ...range,
      durationMinutes: config.durationMinutes, gapMinutes: config.gapMinutes,
      minPlayers: config.minPlayers, maxPlayers: config.maxPlayers,
      capacity: config.capacity, price: config.price,
    }));
  });
}

export default function AdminAvailabilityPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<TargetType>("game");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [week, setWeek] = useState<WeekConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setLoadError("");
      const response = await fetch("/api/availability", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در دریافت اطلاعات");
      setItems([...data.games, ...data.events]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visibleItems = useMemo(() => items.filter((item) => item.type === tab), [items, tab]);
  const selected = useMemo(() => items.find((item) => item.type === tab && item.id === selectedId) ?? null, [items, tab, selectedId]);

  function select(item: Item) {
    setSelectedId(item.id);
    setWeek(toWeek(item.rules, { ...defaults, ...item.settings }));
    setError(""); setSuccess("");
  }
  function changeTab(next: TargetType) { setTab(next); setSelectedId(null); setWeek(null); setError(""); setSuccess(""); }
  function updateDay(day: number, key: keyof Settings, value: string) {
    setWeek((current) => current ? ({ ...current, [day]: { ...current[day], [key]: Number(value) } }) : current);
  }
  function setRanges(day: number, ranges: TimeRange[]) {
    setWeek((current) => current ? ({ ...current, [day]: { ...current[day], ranges } }) : current);
  }
  function updateRange(day: number, index: number, key: keyof TimeRange, value: string) {
    if (!week) return;
    setRanges(day, week[day].ranges.map((range, i) => i === index ? { ...range, [key]: value } : range));
  }
  function toggleDay(day: number, enabled: boolean) {
    if (!week) return;
    setRanges(day, enabled ? [{ startTime: "10:00", endTime: "22:00" }] : []);
  }
  function copyToAll(day: number) {
    if (!week) return;
    const source = week[day];
    setWeek(Object.fromEntries(WEEKDAYS.map((d) => [d.value, { ...source, ranges: source.ranges.map((r) => ({ ...r })) }])) as WeekConfig);
  }

  async function save() {
    if (!selected || !week) return;
    setError(""); setSuccess("");
    const rules = toRules(week);
    const rulesError = validateRules(rules);
    if (rulesError) { setError(rulesError); return; }
    for (const day of WEEKDAYS) {
      const d = week[day.value];
      if (d.minPlayers < 1 || d.maxPlayers < d.minPlayers || d.capacity < Math.max(1, d.minPlayers) || d.durationMinutes < 5 || d.gapMinutes < 0 || d.price < 0) {
        setError(`تنظیمات روز ${day.label} معتبر نیست.`); return;
      }
    }
    const activeConfigs = WEEKDAYS.map((d) => week[d.value]).filter((d) => d.ranges.length);
    const fallback = activeConfigs[0] ?? defaults;
    try {
      setSaving(true);
      const response = await fetch(`/api/availability/${selected.type}/${selected.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { durationMinutes: fallback.durationMinutes, gapMinutes: fallback.gapMinutes, minPlayers: fallback.minPlayers, maxPlayers: fallback.maxPlayers, price: fallback.price },
          rules,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در ذخیره");
      setItems((current) => current.map((item) => item.type === selected.type && item.id === selected.id ? { ...item, settings: { ...item.settings, ...fallback }, rules } : item));
      setSuccess("زمان‌بندی روزانه ذخیره شد و بلافاصله در رزروها اعمال می‌شود.");
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در ذخیره"); }
    finally { setSaving(false); }
  }

  return <CrudPage eyebrow="PADRA SCHEDULING" title="زمان‌بندی بازی‌ها و ایونت‌ها" description="تمام تنظیمات هر روز مستقل است؛ سانس‌ها خودکار ساخته می‌شوند و ظرفیت بر اساس رزروهای واقعی محاسبه می‌شود.">
    {loadError && <div className="crud-alert crud-alert--error" role="alert">{loadError}</div>}
    <div className="av-layout">
      <CrudCard title="انتخاب مورد">
        <div className="av-tabs">
          <button type="button" className={tab === "game" ? "active" : ""} onClick={() => changeTab("game")}>بازی‌ها</button>
          <button type="button" className={tab === "event" ? "active" : ""} onClick={() => changeTab("event")}>ایونت‌ها</button>
        </div>
        {loading ? <div className="crud-empty">در حال دریافت...</div> : visibleItems.length === 0 ? <div className="crud-empty">موردی وجود ندارد.</div> : <div className="av-list">{visibleItems.map((item) => <button type="button" key={`${item.type}-${item.id}`} className={`av-item ${selectedId === item.id ? "active" : ""} ${item.isActive ? "" : "inactive"}`} onClick={() => select(item)}><strong>{item.name}</strong><small>{fa(new Set(item.rules.map((r) => r.weekday)).size)} روز فعال</small></button>)}</div>}
      </CrudCard>
      {selected && week ? <CrudCard title={selected.name} description={!selected.isActive ? "این مورد غیرفعال است و در صفحه رزرو نمایش داده نمی‌شود." : undefined}>
        <p className="av-hint">مدت، فاصله، حداقل و حداکثر نفرات، ظرفیت کل و قیمت را برای هر روز جداگانه وارد کن. اگر یک روز چند بازه دارد، تنظیمات همان روز برای همه بازه‌ها اعمال می‌شود.</p>
        <div className="av-section-title">برنامه هفتگی</div>
        {WEEKDAYS.map((day) => {
          const config = week[day.value];
          const enabled = config.ranges.length > 0;
          const slots = generateSlots(config.ranges, config.durationMinutes, config.gapMinutes);
          return <div key={day.value} className={`av-day ${enabled ? "" : "off"}`}>
            <div className="av-day-head"><label className="av-day-name"><input type="checkbox" checked={enabled} onChange={(e) => toggleDay(day.value, e.target.checked)} />{day.label}</label><span className="av-day-count">{enabled ? `${fa(slots.length)} سانس` : "تعطیل / بدون رزرو"}</span></div>
            {enabled && <>
              <div className="av-ranges">{config.ranges.map((range, index) => <div className="av-range" key={index}>
                <label>از ساعت</label><input type="time" value={range.startTime} onChange={(e) => updateRange(day.value, index, "startTime", e.target.value)} />
                <label>تا ساعت</label><input type="time" value={range.endTime} onChange={(e) => updateRange(day.value, index, "endTime", e.target.value)} />
                <button type="button" className="av-small-btn danger" onClick={() => setRanges(day.value, config.ranges.filter((_, i) => i !== index))}>حذف</button>
              </div>)}</div>
              <div className="av-range-actions"><button type="button" className="av-small-btn" onClick={() => setRanges(day.value, [...config.ranges, { startTime: "16:00", endTime: "20:00" }])}>+ بازه دیگر</button><button type="button" className="av-small-btn" onClick={() => copyToAll(day.value)}>کپی تنظیمات این روز به همه روزها</button></div>
              <div className="av-settings">
                <CrudField label="مدت هر سانس (دقیقه)"><input type="number" min={5} max={600} value={config.durationMinutes} onChange={(e) => updateDay(day.value, "durationMinutes", e.target.value)} /></CrudField>
                <CrudField label="فاصله سانس‌ها (دقیقه)"><input type="number" min={0} max={240} value={config.gapMinutes} onChange={(e) => updateDay(day.value, "gapMinutes", e.target.value)} /></CrudField>
                <CrudField label="حداقل نفرات هر رزرو"><input type="number" min={1} value={config.minPlayers} onChange={(e) => updateDay(day.value, "minPlayers", e.target.value)} /></CrudField>
                <CrudField label="حداکثر نفرات هر رزرو"><input type="number" min={1} value={config.maxPlayers} onChange={(e) => updateDay(day.value, "maxPlayers", e.target.value)} /></CrudField>
                <CrudField label="ظرفیت کل هر سانس"><input type="number" min={1} value={config.capacity} onChange={(e) => updateDay(day.value, "capacity", e.target.value)} /></CrudField>
                <CrudField label="قیمت هر نفر (تومان)"><input type="number" min={0} value={config.price} onChange={(e) => updateDay(day.value, "price", e.target.value)} /></CrudField>
              </div>
              {slots.length > 0 && <div className="av-chips" aria-label="پیش‌نمایش سانس‌ها">{slots.map((slot) => <span className="av-chip" key={slot.startTime}>{slot.startTime}–{slot.endTime}</span>)}</div>}
            </>}
          </div>;
        })}
        {error && <div className="crud-alert crud-alert--error" role="alert">{error}</div>}{success && <div className="crud-alert crud-alert--success" role="status">{success}</div>}
        <div className="crud-form-actions"><button type="button" className="crud-button crud-button--primary" onClick={save} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره زمان‌بندی"}</button></div>
      </CrudCard> : <CrudCard title="زمان‌بندی"><div className="crud-empty">یک بازی یا ایونت را از فهرست انتخاب کنید.</div></CrudCard>}
    </div>
  </CrudPage>;
}
