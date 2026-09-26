"use client";

import { useEffect, useState } from "react";
import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import "./event.css";

type EventItem = {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
    sortOrder: number;
    isActive: boolean;
};

const emptyForm = {
    title: "",
    description: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    sortOrder: "0",
    isActive: true,
};

export default function EventsAdminPage() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [sortOrder, setSortOrder] = useState("0");
    const [isActive, setIsActive] = useState(true);

    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        try {
            const response = await fetch("/api/events");

            if (!response.ok) {
                throw new Error();
            }

            const data = await response.json();
            setEvents(data);
        } catch (error) {
            console.error(error);
            alert("خطا در دریافت ایونت‌ها");
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setEditingId(null);
        setTitle(emptyForm.title);
        setDescription(emptyForm.description);
        setEventDate(emptyForm.eventDate);
        setStartTime(emptyForm.startTime);
        setEndTime(emptyForm.endTime);
        setSortOrder(emptyForm.sortOrder);
        setIsActive(emptyForm.isActive);
        setImage(null);
    }

    function editEvent(event: EventItem) {
        setEditingId(event.id);

        setTitle(event.title);
        setDescription(event.description || "");

        const date = new Date(event.eventDate);

        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            setEventDate(`${year}-${month}-${day}`);
        } else {
            setEventDate("");
        }

        setStartTime(event.startTime || "");
        setEndTime(event.endTime || "");
        setSortOrder(String(event.sortOrder));
        setIsActive(event.isActive);
        setImage(event.image || null);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function uploadImage(file: File) {
        if (!file.type.startsWith("image/")) {
            alert("فقط فایل تصویری مجاز است");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("حجم تصویر نباید بیشتر از ۵ مگابایت باشد");
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/menu/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "خطا در آپلود تصویر");
            }

            setImage(data.url);
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : "خطا در آپلود تصویر"
            );
        } finally {
            setUploading(false);
        }
    }

    async function saveEvent() {
        if (!title.trim()) {
            alert("عنوان ایونت را وارد کنید");
            return;
        }

        if (!eventDate) {
            alert("تاریخ ایونت را وارد کنید");
            return;
        }

        const payload = {
            title: title.trim(),
            description: description.trim() || null,
            image,
            eventDate,
            startTime: startTime || null,
            endTime: endTime || null,
            sortOrder: Number(sortOrder || 0),
            isActive,
        };

        try {
            setSaving(true);

            const url = editingId
                ? `/api/events/${editingId}`
                : "/api/events";

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
                throw new Error(data.error || "خطا در ذخیره ایونت");
            }

            await loadEvents();
            resetForm();

            alert(
                editingId
                    ? "ایونت با موفقیت ویرایش شد"
                    : "ایونت با موفقیت ایجاد شد"
            );
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : "خطا در ذخیره ایونت"
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteEvent(id: number) {
        const confirmed = window.confirm(
            "آیا از حذف این ایونت مطمئن هستید؟"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/events/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "خطا در حذف ایونت");
            }

            setEvents((current) =>
                current.filter((event) => event.id !== id)
            );

            if (editingId === id) {
                resetForm();
            }
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : "خطا در حذف ایونت"
            );
        }
    }

    async function toggleActive(event: EventItem) {
        try {
            const response = await fetch(`/api/events/${event.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: event.title,
                    description: event.description,
                    image: event.image,
                    eventDate: event.eventDate,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    sortOrder: event.sortOrder,
                    isActive: !event.isActive,
                }),
            });

            if (!response.ok) {
                throw new Error();
            }

            setEvents((current) =>
                current.map((item) =>
                    item.id === event.id
                        ? {
                            ...item,
                            isActive: !item.isActive,
                        }
                        : item
                )
            );
        } catch (error) {
            console.error(error);
            alert("خطا در تغییر وضعیت ایونت");
        }
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("fa-IR");
    }

    return (
        <div className="events-page">
            <div className="events-header">
                <div>
                    <span className="eyebrow">PADRA EVENTS</span>

                    <h1>ایونت‌ها</h1>

                    <p>
                        برنامه‌ها و رویدادهای پادرا را مدیریت کنید.
                    </p>
                </div>

                {editingId && (
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={resetForm}
                    >
                        + ایونت جدید
                    </button>
                )}
            </div>

            <section className="event-form-card">
                <div className="form-title">
                    <div>
                        <h2>
                            {editingId
                                ? "ویرایش ایونت"
                                : "ایجاد ایونت جدید"}
                        </h2>

                        <p>
                            اطلاعات برنامه‌ای که می‌خواهید در سایت نمایش داده شود را وارد کنید.
                        </p>
                    </div>
                </div>

                <div className="event-form">
                    <div className="field">
                        <label>عنوان ایونت</label>

                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثلاً مسابقه لیزرتگ"
                        />
                    </div>

                    <div className="field">
                        <label>تاریخ</label>

                        <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            value={eventDate || ""}
                            onChange={(date) => {
                                if (!date) {
                                    setEventDate("");
                                    return;
                                }

                                setEventDate(date.toDate().toISOString());
                            }}
                            format="YYYY/MM/DD"
                            calendarPosition="bottom-right"
                            placeholder="تاریخ ایونت را انتخاب کنید"
                        />
                    </div>

                    <div className="field">
                        <label>ساعت شروع</label>

                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>

                    <div className="field">
                        <label>ساعت پایان</label>

                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>

                    <div className="field">
                        <label>ترتیب نمایش</label>

                        <input
                            type="number"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            min="0"
                        />
                    </div>

                    <div className="field field-full">
                        <label>توضیحات</label>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="توضیح کوتاهی درباره این ایونت..."
                            rows={4}
                        />
                    </div>

                    <div className="field field-full">
                        <label>تصویر ایونت</label>

                        <div className="image-upload-box">
                            {image ? (
                                <div className="image-preview">
                                    <img
                                        src={image}
                                        alt={title || "تصویر ایونت"}
                                    />

                                    <div className="image-overlay">
                                        <label className="change-image">
                                            تغییر تصویر

                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files?.[0];

                                                    if (file) {
                                                        uploadImage(file);
                                                    }

                                                    e.currentTarget.value = "";
                                                }}
                                            />
                                        </label>

                                        <button
                                            type="button"
                                            className="remove-image"
                                            onClick={() => setImage(null)}
                                        >
                                            حذف تصویر
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="upload-placeholder">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0];

                                            if (file) {
                                                uploadImage(file);
                                            }

                                            e.currentTarget.value = "";
                                        }}
                                    />

                                    <div className="upload-icon">
                                        {uploading ? "..." : "↑"}
                                    </div>

                                    <strong>
                                        {uploading
                                            ? "در حال آپلود..."
                                            : "انتخاب تصویر"}
                                    </strong>

                                    <span>
                                        JPG، PNG یا WEBP — حداکثر ۵ مگابایت
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="active-row">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) =>
                                    setIsActive(e.target.checked)
                                }
                            />

                            <span className="slider" />
                        </label>

                        <div>
                            <strong>نمایش ایونت</strong>

                            <span>
                                ایونت فعال در سایت نمایش داده می‌شود.
                            </span>
                        </div>
                    </div>

                    <div className="form-actions">
                        {editingId && (
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={resetForm}
                            >
                                انصراف
                            </button>
                        )}

                        <button
                            type="button"
                            className="save-button"
                            onClick={saveEvent}
                            disabled={saving || uploading}
                        >
                            {saving
                                ? "در حال ذخیره..."
                                : editingId
                                    ? "ذخیره تغییرات"
                                    : "ایجاد ایونت"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="events-list-section">
                <div className="list-header">
                    <div>
                        <h2>لیست ایونت‌ها</h2>

                        <span>
                            {events.length.toLocaleString("fa-IR")} ایونت
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        در حال دریافت اطلاعات...
                    </div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        هنوز هیچ ایونتی ثبت نشده است.
                    </div>
                ) : (
                    <div className="events-table">
                        <div className="table-head">
                            <span>ایونت</span>
                            <span>تاریخ</span>
                            <span>زمان</span>
                            <span>وضعیت</span>
                            <span>عملیات</span>
                        </div>

                        {events.map((event) => (
                            <div
                                className="table-row"
                                key={event.id}
                            >
                                <div className="event-info">
                                    {event.image ? (
                                        <img
                                            src={event.image}
                                            alt={event.title}
                                            className="event-image"
                                        />
                                    ) : (
                                        <div className="event-placeholder">
                                            ★
                                        </div>
                                    )}

                                    <div>
                                        <strong>{event.title}</strong>

                                        {event.description && (
                                            <span>
                                                {event.description}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="date-cell">
                                    {formatDate(event.eventDate)}
                                </div>

                                <div className="time-cell">
                                    {event.startTime || "--:--"}

                                    {event.endTime && (
                                        <>
                                            {" "}
                                            تا {event.endTime}
                                        </>
                                    )}
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        className={`status-badge ${event.isActive
                                            ? "active"
                                            : "inactive"
                                            }`}
                                        onClick={() =>
                                            toggleActive(event)
                                        }
                                    >
                                        {event.isActive
                                            ? "فعال"
                                            : "غیرفعال"}
                                    </button>
                                </div>

                                <div className="row-actions">
                                    <button
                                        type="button"
                                        className="edit-button"
                                        onClick={() =>
                                            editEvent(event)
                                        }
                                    >
                                        ویرایش
                                    </button>

                                    <button
                                        type="button"
                                        className="delete-button"
                                        onClick={() =>
                                            deleteEvent(event.id)
                                        }
                                    >
                                        حذف
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>


        </div>
    );
}