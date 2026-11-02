"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./calendar.css";

type EventItem = {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  capacity?: number | null;
  genre?: string | null;
  duration?: number | null;
  isActive: boolean;
};

type Occurrence = {
  id: number;
  eventId: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity: number | null;
  isActive: boolean;
  sortOrder: number;
  event: EventItem;
};

type FormData = {
  eventId: string;
  startTime: string;
  endTime: string;
  price: string;
  capacity: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  eventId: "",
  startTime: "",
  endTime: "",
  price: "",
  capacity: "",
  isActive: true,
};

const weekDays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => {
    return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
  });
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => {
      return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
    })
    .replace(/[٠-٩]/g, (digit) => {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    });
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price);
}

function getJalaliDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function getJalaliParts(date: Date) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(date);

    const year = Number(
      parts.find((part) => part.type === "year")?.value
    );

    const month = Number(
      parts.find((part) => part.type === "month")?.value
    );

    const day = Number(
      parts.find((part) => part.type === "day")?.value
    );

    return { year, month, day };
  } catch {
    return null;
  }
}

function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): Date {
  const gy = jy + 621;

  let days =
    365 * (jy - 1) +
    Math.floor((jy - 1) / 4) -
    Math.floor((jy - 1) / 100) +
    Math.floor((jy - 1) / 400);

  const monthDays = [
    31,
    31,
    31,
    31,
    31,
    31,
    30,
    30,
    30,
    30,
    30,
    29,
  ];

  for (let i = 0; i < jm - 1; i++) {
    days += monthDays[i];
  }

  days += jd;

  const epoch = new Date(622, 2, 22);

  const result = new Date(epoch);
  result.setDate(result.getDate() + days - 226895);

  return result;
}

function gregorianToDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseJalaliInput(value: string) {
  const normalized = toEnglishDigits(value)
    .replace(/\//g, "-")
    .trim();

  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return jalaliToGregorian(year, month, day);
}

function getInitialDate() {
  return new Date();
}

export default function EventsCalendarPage() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const router = useRouter();

  const [selectedDate, setSelectedDate] =
    useState<Date>(getInitialDate());

  const [dateInput, setDateInput] = useState(
    getJalaliDate(getInitialDate())
  );

  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedDateString = useMemo(() => {
    return gregorianToDateString(selectedDate);
  }, [selectedDate]);

  const selectedJalaliDate = useMemo(() => {
    return getJalaliDate(selectedDate);
  }, [selectedDate]);

  const selectedWeekDay = useMemo(() => {
    const day = selectedDate.getDay();

    const mapping = [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
      "شنبه",
    ];

    return mapping[day];
  }, [selectedDate]);

  async function loadEvents() {
    try {
      const response = await fetch("/api/events", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setEvents(
        Array.isArray(data)
          ? data.filter((event) => event.isActive)
          : []
      );
    } catch {
      setError("خطا در دریافت لیست ایونت‌ها");
    }
  }

  async function loadOccurrences(date: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/occurrences?date=${date}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setOccurrences(Array.isArray(data) ? data : []);
    } catch {
      setError("خطا در دریافت ایونت‌های این روز");
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadOccurrences(selectedDateString);
  }, [selectedDateString]);

  function handleDateInputChange(value: string) {
    setDateInput(value);

    const parsed = parseJalaliInput(value);

    if (!parsed) return;

    setSelectedDate(parsed);
  }

  function goToday() {
    const today = new Date();

    setSelectedDate(today);
    setDateInput(getJalaliDate(today));
  }

  function openCreateForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      eventId: events.length === 1 ? String(events[0].id) : "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(item: Occurrence) {
    setEditingId(item.id);

    setForm({
      eventId: String(item.eventId),
      startTime: item.startTime,
      endTime: item.endTime,
      price: String(item.price),
      capacity:
        item.capacity !== null
          ? String(item.capacity)
          : "",
      isActive: item.isActive,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm(
    field: keyof FormData,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.eventId) {
      setError("لطفاً ایونت را انتخاب کنید");
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError("ساعت شروع و پایان را وارد کنید");
      return;
    }

    if (form.startTime >= form.endTime) {
      setError("ساعت پایان باید بعد از ساعت شروع باشد");
      return;
    }

    if (form.price === "") {
      setError("قیمت را وارد کنید");
      return;
    }

    const price = Number(
      toEnglishDigits(form.price)
    );

    if (!Number.isFinite(price) || price < 0) {
      setError("قیمت معتبر نیست");
      return;
    }

    let capacity: number | null = null;

    if (form.capacity.trim() !== "") {
      capacity = Number(
        toEnglishDigits(form.capacity)
      );

      if (!Number.isFinite(capacity) || capacity <= 0) {
        setError("ظرفیت معتبر نیست");
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        eventId: Number(form.eventId),
        date: selectedDateString,
        startTime: form.startTime,
        endTime: form.endTime,
        price,
        capacity,
        isActive: form.isActive,
      };

      const url = editingId
        ? `/api/events/occurrences/${editingId}`
        : "/api/events/occurrences";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "خطا در ذخیره اطلاعات"
        );
      }

      setSuccess(
        editingId
          ? "ایونت با موفقیت ویرایش شد"
          : "ایونت با موفقیت اضافه شد"
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadOccurrences(selectedDateString);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره ایونت"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Occurrence) {
    const confirmed = await confirmDialog(
      `آیا از حذف «${item.event.title}» در ساعت ${item.startTime} مطمئن هستید؟`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/events/occurrences/${item.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "خطا در حذف ایونت"
        );
      }

      setSuccess("ایونت با موفقیت حذف شد");

      await loadOccurrences(selectedDateString);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در حذف ایونت"
      );
    }
  }

  function changeDate(days: number) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);

    setSelectedDate(nextDate);
    setDateInput(getJalaliDate(nextDate));
  }

  return (
    <main className="events-calendar-page">
      <div className="calendar-container">

        {/* Header */}
        <header className="calendar-header">

          <div>
            <div className="calendar-eyebrow">
              EVENT SCHEDULE
            </div>

            <h1>
              برنامه ایونت‌ها
            </h1>

            <p>
              ایونت‌های هر روز را مدیریت و زمان‌بندی کنید.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/admin/events")}
          >
            ← مدیریت ایونت‌ها
          </button>

        </header>


        {/* Date Selector */}
        <section className="date-panel">

          <div className="date-navigation">

            <button
              type="button"
              className="date-arrow"
              onClick={() => changeDate(-1)}
            >
              ‹
            </button>

            <div className="selected-date">

              <div className="selected-date-weekday">
                {selectedWeekDay}
              </div>

              <div className="selected-date-value">
                {selectedJalaliDate}
              </div>

            </div>

            <button
              type="button"
              className="date-arrow"
              onClick={() => changeDate(1)}
            >
              ›
            </button>

          </div>


          <div className="date-controls">

            <label>
              <span>انتخاب تاریخ</span>

              <input
                type="text"
                value={dateInput}
                onChange={(event) =>
                  handleDateInputChange(event.target.value)
                }
                placeholder="۱۴۰۵/۰۷/۱۱"
                dir="ltr"
              />
            </label>

            <button
              type="button"
              className="today-button"
              onClick={goToday}
            >
              امروز
            </button>

          </div>

        </section>


        {/* Messages */}
        {error && (
          <div className="message message-error">
            {error}
          </div>
        )}

        {success && (
          <div className="message message-success">
            {success}
          </div>
        )}


        {/* Day Header */}
        <section className="day-section">

          <div className="day-section-header">

            <div>
              <div className="day-section-label">
                برنامه امروز
              </div>

              <h2>
                {selectedWeekDay} {selectedJalaliDate}
              </h2>
            </div>

            <button
              type="button"
              className="add-event-button"
              onClick={openCreateForm}
              disabled={events.length === 0}
            >
              <span>＋</span>
              افزودن ایونت
            </button>

          </div>


          {/* Occurrences */}
          {loading ? (
            <div className="loading-box">
              <div className="loading-spinner" />
              در حال دریافت برنامه...
            </div>
          ) : occurrences.length === 0 ? (
            <div className="empty-box">

              <div className="empty-icon">
                ◷
              </div>

              <h3>
                برای این روز ایونتی ثبت نشده
              </h3>

              <p>
                می‌توانید اولین ایونت این روز را اضافه کنید.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                disabled={events.length === 0}
              >
                ＋ افزودن ایونت
              </button>

            </div>
          ) : (
            <div className="occurrences-grid">

              {occurrences.map((item) => (
                <article
                  className={`occurrence-card ${
                    !item.isActive
                      ? "is-inactive"
                      : ""
                  }`}
                  key={item.id}
                >

                  <div className="occurrence-card-top">

                    <div className="occurrence-title-wrap">

                      {item.event.image ? (
                        <img loading="lazy" decoding="async"
                          src={item.event.image}
                          alt={item.event.title}
                          className="occurrence-image"
                        />
                      ) : (
                        <div className="occurrence-image-placeholder">
                          ✦
                        </div>
                      )}

                      <div>
                        <h3>
                          {item.event.title}
                        </h3>

                        {item.event.genre && (
                          <span className="occurrence-genre">
                            {item.event.genre}
                          </span>
                        )}
                      </div>

                    </div>

                    <span
                      className={`status-badge ${
                        item.isActive
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {item.isActive
                        ? "فعال"
                        : "غیرفعال"}
                    </span>

                  </div>


                  <div className="occurrence-time">

                    <strong>
                      {toPersianDigits(item.startTime)}
                    </strong>

                    <span>
                      تا
                    </span>

                    <strong>
                      {toPersianDigits(item.endTime)}
                    </strong>

                  </div>


                  <div className="occurrence-details">

                    <div>
                      <span>قیمت</span>
                      <strong>
                        {formatPrice(item.price)}
                        <small> تومان</small>
                      </strong>
                    </div>

                    <div>
                      <span>ظرفیت</span>
                      <strong>
                        {item.capacity ??
                          item.event.capacity ??
                          "—"}
                        <small> نفر</small>
                      </strong>
                    </div>

                    {item.event.duration && (
                      <div>
                        <span>مدت</span>
                        <strong>
                          {toPersianDigits(
                            item.event.duration
                          )}
                          <small> دقیقه</small>
                        </strong>
                      </div>
                    )}

                  </div>


                  <div className="occurrence-actions">

                    <button
                      type="button"
                      className="edit-button"
                      onClick={() =>
                        openEditForm(item)
                      }
                    >
                      ✎ ویرایش
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        handleDelete(item)
                      }
                    >
                      × حذف
                    </button>

                  </div>

                </article>
              ))}

            </div>
          )}

        </section>


        {/* Form */}
        {showForm && (
          <div className="modal-backdrop">

            <div className="event-modal">

              <div className="modal-header">

                <div>
                  <span>
                    {editingId
                      ? "ویرایش برنامه"
                      : "برنامه جدید"}
                  </span>

                  <h2>
                    {editingId
                      ? "ویرایش ایونت"
                      : "افزودن ایونت برای این روز"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeForm}
                  disabled={saving}
                >
                  ×
                </button>

              </div>


              <div className="modal-date">
                <span>
                  تاریخ برنامه
                </span>

                <strong>
                  {selectedWeekDay} —{" "}
                  {selectedJalaliDate}
                </strong>
              </div>


              <form
                className="event-form"
                onSubmit={handleSubmit}
              >

                <label>
                  <span>
                    ایونت
                  </span>

                  <select
                    value={form.eventId}
                    onChange={(event) =>
                      updateForm(
                        "eventId",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      انتخاب ایونت
                    </option>

                    {events.map((event) => (
                      <option
                        key={event.id}
                        value={event.id}
                      >
                        {event.title}
                      </option>
                    ))}
                  </select>
                </label>


                <div className="form-row">

                  <label>
                    <span>
                      ساعت شروع
                    </span>

                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(event) =>
                        updateForm(
                          "startTime",
                          event.target.value
                        )
                      }
                    />
                  </label>


                  <label>
                    <span>
                      ساعت پایان
                    </span>

                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(event) =>
                        updateForm(
                          "endTime",
                          event.target.value
                        )
                      }
                    />
                  </label>

                </div>


                <div className="form-row">

                  <label>
                    <span>
                      قیمت
                    </span>

                    <div className="input-suffix">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.price}
                        onChange={(event) =>
                          updateForm(
                            "price",
                            toEnglishDigits(
                              event.target.value
                            ).replace(
                              /[^\d]/g,
                              ""
                            )
                          )
                        }
                        placeholder="300000"
                      />

                      <small>
                        تومان
                      </small>
                    </div>
                  </label>


                  <label>
                    <span>
                      ظرفیت
                    </span>

                    <div className="input-suffix">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.capacity}
                        onChange={(event) =>
                          updateForm(
                            "capacity",
                            toEnglishDigits(
                              event.target.value
                            ).replace(
                              /[^\d]/g,
                              ""
                            )
                          )
                        }
                        placeholder="12"
                      />

                      <small>
                        نفر
                      </small>
                    </div>
                  </label>

                </div>


                <label className="active-field">

                  <span>
                    وضعیت
                  </span>

                  <button
                    type="button"
                    className={`toggle ${
                      form.isActive
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      updateForm(
                        "isActive",
                        !form.isActive
                      )
                    }
                  >
                    <span />
                  </button>

                  <strong>
                    {form.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </strong>

                </label>


                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                    disabled={saving}
                  >
                    {saving
                      ? "در حال ذخیره..."
                      : editingId
                      ? "ذخیره تغییرات"
                      : "افزودن ایونت"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}