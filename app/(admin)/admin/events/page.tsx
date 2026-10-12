"use client";

import { useEffect, useState } from "react";

import "./event.css";

type EventItem = {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    capacity: number | null;
    genre: string | null;
    duration: number | null;
    sortOrder: number;
    isActive: boolean;
    _count?: {
        occurrences: number;
    };
};

export default function EventsAdminPage() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [capacity, setCapacity] = useState("");
    const [genre, setGenre] = useState("");
    const [duration, setDuration] = useState("");
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
        setTitle("");
        setDescription("");
        setCapacity("");
        setGenre("");
        setDuration("");
        setSortOrder("0");
        setIsActive(true);
        setImage(null);
    }

    function editEvent(event: EventItem) {
        setEditingId(event.id);

        setTitle(event.title);
        setDescription(event.description || "");
        setCapacity(
            event.capacity !== null && event.capacity !== undefined
                ? String(event.capacity)
                : ""
        );
        setGenre(event.genre || "");
        setDuration(
            event.duration !== null && event.duration !== undefined
                ? String(event.duration)
                : ""
        );
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

        try {
            setSaving(true);

            const payload = {
                title: title.trim(),
                description: description.trim() || null,
                image,
                capacity: capacity ? Number(capacity) : null,
                genre: genre.trim() || null,
                duration: duration ? Number(duration) : null,
                sortOrder: Number(sortOrder || 0),
                isActive,
            };

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
                throw new Error(
                    data.error || "خطا در ذخیره ایونت"
                );
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
            "آیا از حذف این ایونت مطمئن هستید؟ تمام اجراهای این ایونت نیز حذف خواهند شد."
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/events/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "خطا در حذف ایونت"
                );
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
            const response = await fetch(
                `/api/events/${event.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: event.title,
                        description: event.description,
                        image: event.image,
                        capacity: event.capacity,
                        genre: event.genre,
                        duration: event.duration,
                        sortOrder: event.sortOrder,
                        isActive: !event.isActive,
                    }),
                }
            );

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

    return (
        <div className="events-page">
            <div className="events-header">
                <div>
                    <span className="eyebrow">
                        PADRA EVENTS
                    </span>

                    <h1>ایونت‌ها</h1>

                    <p>
                        ایونت‌های پادرا را تعریف و مدیریت کنید.
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
                                : "تعریف ایونت جدید"}
                        </h2>

                        <p>
                            اطلاعات ثابت ایونت را وارد کنید.
                            تاریخ و ساعت برگزاری در بخش «اجراها»
                            تعریف می‌شود.
                        </p>
                    </div>
                </div>

                <div className="event-form">
                    <div className="field">
                        <label>عنوان ایونت</label>

                        <input
                            value={title}
                            onChange={(e) =>
                                setTitle(e.target.value)
                            }
                            placeholder="مثلاً Deception"
                        />
                    </div>

                    <div className="field">
                        <label>سبک / ژانر</label>

                        <input
                            value={genre}
                            onChange={(e) =>
                                setGenre(e.target.value)
                            }
                            placeholder="مثلاً معمایی، جنایی"
                        />
                    </div>

                    <div className="field">
                        <label>ظرفیت</label>

                        <div className="input-with-suffix">
                            <input
                                type="number"
                                min="1"
                                value={capacity}
                                onChange={(e) =>
                                    setCapacity(e.target.value)
                                }
                                placeholder="12"
                            />

                            <span>نفر</span>
                        </div>
                    </div>

                    <div className="field">
                        <label>مدت زمان</label>

                        <div className="input-with-suffix">
                            <input
                                type="number"
                                min="1"
                                value={duration}
                                onChange={(e) =>
                                    setDuration(e.target.value)
                                }
                                placeholder="120"
                            />

                            <span>دقیقه</span>
                        </div>
                    </div>

                    <div className="field">
                        <label>ترتیب نمایش</label>

                        <input
                            type="number"
                            min="0"
                            value={sortOrder}
                            onChange={(e) =>
                                setSortOrder(e.target.value)
                            }
                        />
                    </div>

                    <div className="field field-full">
                        <label>توضیحات</label>

                        <textarea
                            value={description}
                            onChange={(e) =>
                                setDescription(e.target.value)
                            }
                            placeholder="مثلاً یک تجربه معمایی و جنایی در اتاق جنایی پادرا..."
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
                                        alt={
                                            title ||
                                            "تصویر ایونت"
                                        }
                                    />

                                    <div className="image-overlay">
                                        <label className="change-image">
                                            تغییر تصویر

                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file =
                                                        e
                                                            .target
                                                            .files?.[0];

                                                    if (file) {
                                                        uploadImage(
                                                            file
                                                        );
                                                    }

                                                    e.currentTarget.value =
                                                        "";
                                                }}
                                            />
                                        </label>

                                        <button
                                            type="button"
                                            className="remove-image"
                                            onClick={() =>
                                                setImage(null)
                                            }
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

                                            e.currentTarget.value =
                                                "";
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
                                        JPG، PNG یا WEBP — حداکثر
                                        ۵ مگابایت
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
                                    setIsActive(
                                        e.target.checked
                                    )
                                }
                            />

                            <span className="slider" />
                        </label>

                        <div>
                            <strong>ایونت فعال</strong>

                            <span>
                                ایونت‌های فعال می‌توانند اجرا
                                داشته باشند و در سایت نمایش داده
                                شوند.
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
                            disabled={
                                saving || uploading
                            }
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
                        <h2>ایونت‌های تعریف‌شده</h2>

                        <span>
                            {events.length.toLocaleString(
                                "fa-IR"
                            )}{" "}
                            ایونت
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        در حال دریافت اطلاعات...
                    </div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        هنوز هیچ ایونتی تعریف نشده است.
                    </div>
                ) : (
                    <div className="events-table">
                        <div className="table-head">
                            <span>ایونت</span>
                            <span>ظرفیت</span>
                            <span>مدت</span>
                            <span>اجراها</span>
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
                                        <strong>
                                            {event.title}
                                        </strong>

                                        {event.genre && (
                                            <span>
                                                {event.genre}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="table-cell">
                                    {event.capacity
                                        ? `${event.capacity.toLocaleString(
                                              "fa-IR"
                                          )} نفر`
                                        : "—"}
                                </div>

                                <div className="table-cell">
                                    {event.duration
                                        ? `${event.duration.toLocaleString(
                                              "fa-IR"
                                          )} دقیقه`
                                        : "—"}
                                </div>

                                <div className="table-cell">
                                    {(
                                        event._count
                                            ?.occurrences ?? 0
                                    ).toLocaleString(
                                        "fa-IR"
                                    )}
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        className={`status-badge ${
                                            event.isActive
                                                ? "active"
                                                : "inactive"
                                        }`}
                                        onClick={() =>
                                            toggleActive(
                                                event
                                            )
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
                                        className="occurrence-button"
                                        onClick={() =>
                                            (window.location.href = `/admin/events/${event.id}/occurrences`)
                                        }
                                    >
                                        اجراها
                                    </button>

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
                                            deleteEvent(
                                                event.id
                                            )
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