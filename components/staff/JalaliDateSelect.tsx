"use client";

import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import { normalizeDigits } from "@/lib/availability";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function JalaliDateSelect({ value, onChange, yearsBefore = 0, yearsAfter = 1, disabled }: {
  value: string; onChange: (date: string) => void; yearsBefore?: number; yearsAfter?: number; disabled?: boolean;
}) {
  const safeValue = ISO_DATE.test(normalizeDigits(value)) ? normalizeDigits(value) : "";
  const current = safeValue ? new DateObject({ date: safeValue, format: "YYYY-MM-DD", calendar: gregorian }).convert(persian) : new DateObject({ calendar: persian, locale: persian_fa });
  const minDate = new DateObject({ date: `${current.year - yearsBefore}/01/01`, calendar: persian, locale: persian_fa });
  const maxDate = new DateObject({ date: `${current.year + yearsAfter}/12/29`, calendar: persian, locale: persian_fa });
  return <div className="st-date st-date--calendar" dir="rtl">
    <DatePicker
      value={current}
      calendar={persian}
      locale={persian_fa}
      calendarPosition="bottom-right"
      format="YYYY/MM/DD"
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      inputClass="st-input st-date-picker-input"
      containerClassName="st-date-picker-container"
      onChange={(date) => {
        if (!date || Array.isArray(date)) return;
        // خروجی به‌خاطر locale فارسی ممکن است رقم فارسی داشته باشد؛ همیشه ISO با ارقام لاتین می‌دهیم
        const iso = normalizeDigits((date as DateObject).convert(gregorian).format("YYYY-MM-DD"));
        if (ISO_DATE.test(iso)) onChange(iso);
      }}
    />
  </div>;
}
