"use client";

import { useEffect, useState } from "react";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "./schedule.css";

type Game = {
    id: number;
    name: string;
};

type Schedule = {
    id: number;
    gameId: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    isActive: boolean;
    game: Game;
};

export default function AdminSchedulesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);

    const [gameId, setGameId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [capacity, setCapacity] = useState("10");
    const [isActive, setIsActive] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [duration, setDuration] = useState("20");
    const [interval, setInterval] = useState("10");

    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadGames();
        loadSchedules();
    }, []);

    async function loadGames() {
        try {
            const response = await fetch("/api/games");

            if (!response.ok) {
                throw new Error("خطا در دریافت بازی‌ها");
            }

            const data = await response.json();

            const activeGames = data
                .filter((game: Game & { isActive: boolean }) => game.isActive)
                .sort(
                    (
                        a: Game & { sortOrder: number },
                        b: Game & { sortOrder: number }
                    ) => a.sortOrder - b.sortOrder
                );

            setGames(activeGames);
        } catch (error) {
            console.error(error);
        }
    }

    async function loadSchedules() {
        try {
            setLoading(true);

            const response = await fetch("/api/schedules");

            if (!response.ok) {
                throw new Error("خطا در دریافت سانس‌ها");
            }

            const data = await response.json();

            setSchedules(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    function handleDateChange(value: any) {
        if (!value) {
            setDate("");
            return;
        }

        const gregorianDate = value.toDate();

        const year = gregorianDate.getFullYear();
        const month = String(
            gregorianDate.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            gregorianDate.getDate()
        ).padStart(2, "0");

        setDate(`${year}-${month}-${day}`);
    }

    async function saveSchedule() {
        if (
            !gameId ||
            !date ||
            !startTime ||
            !endTime ||
            !capacity
        ) {
            alert("لطفاً تمام اطلاعات را وارد کنید");
            return;
        }

        try {
            setSaving(true);

            const url = editingId
                ? `/api/schedules/${editingId}`
                : "/api/schedules";

            const method = editingId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gameId: Number(gameId),
                    date,
                    startTime,
                    endTime,
                    capacity: Number(capacity),
                    isActive,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "خطا در ذخیره سانس"
                );
            }

            resetForm();

            await loadSchedules();

            alert(
                editingId
                    ? "سانس با موفقیت ویرایش شد"
                    : "سانس با موفقیت ایجاد شد"
            );
        } catch (error) {
            console.error(error);

            alert(
                error instanceof Error
                    ? error.message
                    : "خطا در ذخیره سانس"
            );
        } finally {
            setSaving(false);
        }
    }

    function editSchedule(schedule: Schedule) {
        setEditingId(schedule.id);

        setGameId(String(schedule.gameId));

        const date = new Date(schedule.date);

        const year = date.getFullYear();
        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        setDate(`${year}-${month}-${day}`);

        setStartTime(schedule.startTime);
        setEndTime(schedule.endTime);
        setCapacity(String(schedule.capacity));
        setIsActive(schedule.isActive);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function deleteSchedule(id: number) {
        if (!confirm("آیا از حذف این سانس مطمئن هستید؟")) {
            return;
        }

        try {
            const response = await fetch(
                `/api/schedules/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("خطا در حذف سانس");
            }

            await loadSchedules();
        } catch (error) {
            console.error(error);

            alert("حذف سانس انجام نشد");
        }
    }

    function resetForm() {
        setEditingId(null);
        setGameId("");
        setDate("");
        setStartTime("");
        setEndTime("");
        setCapacity("10");
        setIsActive(true);
    }

    function formatDate(dateString: string) {
        return new Intl.DateTimeFormat("fa-IR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date(dateString));
    }
    async function generateSchedules() {
        if (
            !gameId ||
            !date ||
            !startTime ||
            !endTime ||
            !duration ||
            !capacity
        ) {
            alert("لطفاً تمام اطلاعات را وارد کنید");
            return;
        }

        try {
            setGenerating(true);

            const response = await fetch(
                "/api/schedules/generate",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        gameId: Number(gameId),
                        date,
                        startTime,
                        endTime,
                        duration: Number(duration),
                        interval: Number(interval),
                        capacity: Number(capacity),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "خطا در تولید سانس‌ها"
                );
            }

            alert(
                `${data.created.toLocaleString(
                    "fa-IR"
                )} سانس ایجاد شد`
            );

            await loadSchedules();
        } catch (error) {
            console.error(error);

            alert(
                error instanceof Error
                    ? error.message
                    : "خطا در تولید سانس‌ها"
            );
        } finally {
            setGenerating(false);
        }
    }
    return (
        <div className="schedule-admin">

            <div className="schedule-admin-header">

                <div>
                    <span>BOOKING MANAGEMENT</span>

                    <h1>
                        مدیریت <strong>سانس‌ها</strong>
                    </h1>

                    <p>
                        سانس‌های قابل رزرو بازی‌ها را مدیریت کنید.
                    </p>
                </div>

            </div>

            {/* FORM */}

            <div className="schedule-form-grid">

                <div className="schedule-field">

                    <label>بازی</label>

                    <select
                        value={gameId}
                        onChange={(e) =>
                            setGameId(e.target.value)
                        }
                    >
                        <option value="">
                            انتخاب بازی
                        </option>

                        {games.map((game) => (
                            <option
                                key={game.id}
                                value={game.id}
                            >
                                {game.name}
                            </option>
                        ))}
                    </select>

                </div>


                <div className="schedule-field">

                    <label>تاریخ</label>

                    <DatePicker
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        format="YYYY/MM/DD"
                        minDate={new Date()}
                        onChange={handleDateChange}
                        inputClass="schedule-date-input"
                        placeholder="انتخاب تاریخ"
                    />

                </div>


                <div className="schedule-field">

                    <label>شروع فعالیت</label>

                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) =>
                            setStartTime(e.target.value)
                        }
                    />

                </div>


                <div className="schedule-field">

                    <label>پایان فعالیت</label>

                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) =>
                            setEndTime(e.target.value)
                        }
                    />

                </div>


                <div className="schedule-field">

                    <label>مدت هر سانس</label>

                    <select
                        value={duration}
                        onChange={(e) =>
                            setDuration(e.target.value)
                        }
                    >
                        <option value="10">۱۰ دقیقه</option>
                        <option value="15">۱۵ دقیقه</option>
                        <option value="20">۲۰ دقیقه</option>
                        <option value="30">۳۰ دقیقه</option>
                        <option value="45">۴۵ دقیقه</option>
                        <option value="60">۶۰ دقیقه</option>
                    </select>

                </div>


                <div className="schedule-field">

                    <label>فاصله بین سانس‌ها</label>

                    <select
                        value={interval}
                        onChange={(e) =>
                            setInterval(e.target.value)
                        }
                    >
                        <option value="0">
                            بدون فاصله
                        </option>

                        <option value="5">
                            ۵ دقیقه
                        </option>

                        <option value="10">
                            ۱۰ دقیقه
                        </option>

                        <option value="15">
                            ۱۵ دقیقه
                        </option>

                        <option value="20">
                            ۲۰ دقیقه
                        </option>

                        <option value="30">
                            ۳۰ دقیقه
                        </option>
                    </select>

                </div>


                <div className="schedule-field">

                    <label>ظرفیت هر سانس</label>

                    <input
                        type="number"
                        min="1"
                        value={capacity}
                        onChange={(e) =>
                            setCapacity(e.target.value)
                        }
                    />

                </div>

            </div>


            <div className="schedule-generate-info">

                <div>
                    <strong>تولید خودکار سانس‌ها</strong>

                    <span>
                        سیستم بر اساس ساعت شروع، پایان، مدت بازی و
                        فاصله تعیین‌شده سانس‌ها را ایجاد می‌کند.
                    </span>
                </div>

            </div>


            <div className="schedule-form-actions">

                <button
                    type="button"
                    className="schedule-save-button"
                    onClick={generateSchedules}
                    disabled={generating}
                >
                    {generating
                        ? "در حال ایجاد سانس‌ها..."
                        : "تولید سانس‌ها"}

                    {!generating && <span>←</span>}
                </button>

            </div>

            {/* LIST */}

            <section className="schedule-list-card">

                <div className="schedule-list-header">

                    <div>
                        <span>ALL SCHEDULES</span>

                        <h2>
                            لیست سانس‌ها
                        </h2>
                    </div>

                    <div className="schedule-count">
                        {schedules.length.toLocaleString("fa-IR")}
                        <span>سانس</span>
                    </div>

                </div>

                {loading ? (

                    <div className="schedule-empty">
                        در حال دریافت سانس‌ها...
                    </div>

                ) : schedules.length === 0 ? (

                    <div className="schedule-empty">
                        هنوز هیچ سانسی ایجاد نشده است.
                    </div>

                ) : (

                    <div className="schedule-table-wrapper">

                        <table className="schedule-table">

                            <thead>
                                <tr>
                                    <th>بازی</th>
                                    <th>تاریخ</th>
                                    <th>ساعت</th>
                                    <th>ظرفیت</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>

                                {schedules.map((schedule) => (

                                    <tr key={schedule.id}>

                                        <td>
                                            <strong>
                                                {schedule.game.name}
                                            </strong>
                                        </td>

                                        <td>
                                            {formatDate(schedule.date)}
                                        </td>

                                        <td>
                                            <span className="schedule-time">
                                                {schedule.startTime}
                                            </span>

                                            <span className="schedule-to">
                                                تا
                                            </span>

                                            <span className="schedule-time">
                                                {schedule.endTime}
                                            </span>
                                        </td>

                                        <td>
                                            {schedule.capacity.toLocaleString(
                                                "fa-IR"
                                            )} نفر
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    schedule.isActive
                                                        ? "schedule-status active"
                                                        : "schedule-status"
                                                }
                                            >
                                                {schedule.isActive
                                                    ? "فعال"
                                                    : "غیرفعال"}
                                            </span>

                                        </td>

                                        <td>

                                            <div className="schedule-actions">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        editSchedule(schedule)
                                                    }
                                                >
                                                    ویرایش
                                                </button>

                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        deleteSchedule(schedule.id)
                                                    }
                                                >
                                                    حذف
                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>

        </div>
    );
}