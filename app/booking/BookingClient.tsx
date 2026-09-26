"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import "./booking.css";

type Game = {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    duration: string;
    capacity: string;
    price: number;
    sortOrder: number;
    isActive: boolean;
};

type Schedule = {
    id: number;
    gameId: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    isActive: boolean;
};

export default function BookingPage() {
    const searchParams = useSearchParams();

    const gameId = searchParams.get("gameId");

    const [game, setGame] = useState<Game | null>(null);
    const [gameLoading, setGameLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState("");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);

    const [quantity, setQuantity] = useState(4);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

    const [pickerDate, setPickerDate] = useState<any>(null);


    const [error, setError] = useState("");

    useEffect(() => {
        if (!gameId) {
            setGameLoading(false);
            return;
        }

        loadGame();
    }, [gameId]);

    useEffect(() => {
        if (!selectedDate || !gameId) {
            setSchedules([]);
            setSelectedSchedule(null);
            return;
        }

        loadSchedules();
    }, [selectedDate, gameId]);

    async function loadGame() {
        try {
            setGameLoading(true);
            setError("");

            const response = await fetch(`/api/games/${gameId}`);

            if (!response.ok) {
                throw new Error("بازی پیدا نشد");
            }

            const data: Game = await response.json();

            setGame(data);
        } catch (error) {
            console.error("GAME LOAD ERROR:", error);

            setError(
                error instanceof Error
                    ? error.message
                    : "خطا در دریافت اطلاعات بازی"
            );
        } finally {
            setGameLoading(false);
        }
    }

    async function loadSchedules() {
        try {
            setSchedulesLoading(true);
            setSelectedSchedule(null);

            const response = await fetch(
                `/api/games/${gameId}/schedules?date=${selectedDate}`
            );

            if (!response.ok) {
                throw new Error("خطا در دریافت سانس‌ها");
            }

            const data: Schedule[] = await response.json();

            setSchedules(
                data
                    .filter((schedule) => schedule.isActive)
                    .sort((a, b) =>
                        a.startTime.localeCompare(b.startTime)
                    )
            );
        } catch (error) {
            console.error("SCHEDULE LOAD ERROR:", error);

            setSchedules([]);
        } finally {
            setSchedulesLoading(false);
        }
    }

    function handleDateChange(value: any) {
        if (!value) {
            setPickerDate(null);
            setSelectedDate("");
            setSelectedSchedule(null);
            return;
        }

        setPickerDate(value);

        const date = value.toDate();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        setSelectedDate(`${year}-${month}-${day}`);
    }

    function formatPersianDate(dateString: string) {
        const date = new Date(`${dateString}T12:00:00`);

        return new Intl.DateTimeFormat("fa-IR", {
            calendar: "persian",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }).format(date);
    }

    function selectSchedule(schedule: Schedule) {
        setSelectedSchedule(schedule);

        /*
         * اگر ظرفیت سانس کمتر از تعداد انتخابی باشد،
         * تعداد نفرات را به ظرفیت سانس کاهش می‌دهیم.
         */
        if (quantity > schedule.capacity) {
            setQuantity(schedule.capacity);
        }
    }

    const totalAmount =
        game && selectedSchedule
            ? game.price * quantity
            : 0;

    if (gameLoading) {
        return (
            <main className="booking-page">
                <div className="booking-container">
                    <div className="booking-loading">
                        در حال دریافت اطلاعات بازی...
                    </div>
                </div>
            </main>
        );
    }

    if (error || !game) {
        return (
            <main className="booking-page">
                <div className="booking-container">
                    <div className="booking-error">
                        {error || "بازی موردنظر پیدا نشد"}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="booking-page">
            <div className="booking-container">

                {/* Header */}
                <header className="booking-header">
                    <div>
                        <span className="booking-eyebrow">
                            رزرو آنلاین پادرا
                        </span>

                        <h1>رزرو {game.name}</h1>

                        <p>
                            تاریخ، تعداد نفرات و سانس موردنظر خود را انتخاب کنید.
                        </p>
                    </div>
                </header>

                {/* Game Information */}
                <section className="booking-game-card">

                    <div className="booking-game-image">
                        {game.image ? (
                            <img
                                src={game.image}
                                alt={game.name}
                            />
                        ) : (
                            <span>{game.name}</span>
                        )}
                    </div>

                    <div className="booking-game-info">
                        <h2>{game.name}</h2>

                        {game.description && (
                            <p>{game.description}</p>
                        )}

                        <div className="booking-info-grid">

                            <div>
                                <small>مدت بازی</small>
                                <strong>{game.duration}</strong>
                            </div>

                            <div>
                                <small>ظرفیت</small>
                                <strong>{game.capacity}</strong>
                            </div>

                            <div>
                                <small>قیمت هر نفر</small>
                                <strong>
                                    {game.price.toLocaleString("fa-IR")}
                                    {" "}
                                    تومان
                                </strong>
                            </div>

                        </div>
                    </div>

                </section>

                {/* Date + Quantity */}
                <section className="booking-step">

                    <div className="booking-step-title">
                        <span>۱</span>

                        <div>
                            <h2>تاریخ و تعداد نفرات</h2>

                            <p>
                                تاریخ و تعداد نفرات خود را انتخاب کنید.
                            </p>
                        </div>
                    </div>

                    <div className="booking-date-quantity">

                        {/* Date */}
                        <div className="booking-field">
                            <label>تاریخ</label>

                            <DatePicker
                                calendar={persian}
                                locale={persian_fa}
                                calendarPosition="bottom-right"
                                value={pickerDate}
                                onChange={handleDateChange}
                                minDate={new DateObject({
                                    calendar: persian,
                                    locale: persian_fa,
                                })}
                                format="YYYY/MM/DD"
                                inputClass="booking-date-input"
                                placeholder="انتخاب تاریخ"
                            />

                            {selectedDate && (
                                <span className="booking-selected-date">
                                    {formatPersianDate(selectedDate)}
                                </span>
                            )}
                        </div>

                        {/* Quantity */}
                        <div className="booking-field">
                            <label>تعداد نفرات</label>

                            <select
                                className="booking-quantity-select"
                                value={quantity}
                                onChange={(event) => {
                                    const value = Number(event.target.value);

                                    /*
                                     * اگر سانس انتخاب شده باشد،
                                     * تعداد بیشتر از ظرفیت آن انتخاب نشود.
                                     */
                                    if (
                                        selectedSchedule &&
                                        value > selectedSchedule.capacity
                                    ) {
                                        setQuantity(selectedSchedule.capacity);
                                        return;
                                    }

                                    setQuantity(value);
                                }}
                            >
                                {[4, 5, 6, 7, 8, 9, 10].map((number) => (
                                    <option
                                        key={number}
                                        value={number}
                                        disabled={
                                            selectedSchedule
                                                ? number > selectedSchedule.capacity
                                                : false
                                        }
                                    >
                                        {number.toLocaleString("fa-IR")} نفر
                                    </option>
                                ))}
                            </select>

                            <span className="booking-selected-date">
                                حداقل ۴ و حداکثر ۱۰ نفر
                            </span>
                        </div>

                    </div>

                </section>

                {/* Schedules */}
                {selectedDate && (
                    <section className="booking-step">

                        <div className="booking-step-title">
                            <span>۲</span>

                            <div>
                                <h2>انتخاب سانس</h2>

                                <p>
                                    یکی از سانس‌های موجود در تاریخ انتخابی را انتخاب کنید.
                                </p>
                            </div>
                        </div>

                        {schedulesLoading ? (
                            <div className="booking-loading-small">
                                در حال دریافت سانس‌ها...
                            </div>
                        ) : schedules.length === 0 ? (
                            <div className="booking-empty">
                                <strong>
                                    برای این تاریخ سانس فعالی وجود ندارد.
                                </strong>

                                <span>
                                    لطفاً تاریخ دیگری را انتخاب کنید.
                                </span>
                            </div>
                        ) : (
                            <div className="booking-schedules">

                                {schedules.map((schedule) => {

                                    const isSelected =
                                        selectedSchedule?.id === schedule.id;

                                    const isFull =
                                        quantity > schedule.capacity;

                                    return (
                                        <button
                                            type="button"
                                            key={schedule.id}
                                            className={`booking-schedule ${isSelected
                                                ? "selected"
                                                : ""
                                                }`}
                                            disabled={isFull}
                                            onClick={() =>
                                                selectSchedule(schedule)
                                            }
                                        >
                                            <span className="booking-schedule-time">
                                                {schedule.startTime}
                                            </span>

                                            <span className="booking-schedule-separator">
                                                  تا      
                                            </span>

                                            <span className="booking-schedule-time">
                                                {schedule.endTime}
                                            </span>

                                            {/* <span className="booking-schedule-capacity">
                                                ظرفیت {schedule.capacity.toLocaleString("fa-IR")} نفر
                                            </span> */}
                                        </button>
                                    );
                                })}

                            </div>
                        )}

                    </section>
                )}

                {/* Summary */}
                {selectedSchedule && (
                    <section className="booking-step">

                        <div className="booking-step-title">
                            <span>۳</span>

                            <div>
                                <h2>خلاصه رزرو</h2>

                                <p>
                                    اطلاعات رزرو خود را بررسی کنید.
                                </p>
                            </div>
                        </div>

                        <div className="booking-summary">

                            <div className="booking-summary-row">
                                <span>بازی</span>

                                <strong>
                                    {game.name}
                                </strong>
                            </div>

                            <div className="booking-summary-row">
                                <span>تاریخ</span>

                                <strong>
                                    {formatPersianDate(selectedDate)}
                                </strong>
                            </div>

                            <div className="booking-summary-row">
                                <span>سانس</span>

                                <strong>
                                    {selectedSchedule.startTime}
                                    {" "}
                                    تا
                                    {" "}
                                    {selectedSchedule.endTime}
                                </strong>
                            </div>

                            <div className="booking-summary-row">
                                <span>تعداد نفرات</span>

                                <strong>
                                    {quantity.toLocaleString("fa-IR")}
                                    {" "}
                                    نفر
                                </strong>
                            </div>

                            <div className="booking-summary-row">
                                <span>قیمت هر نفر</span>

                                <strong>
                                    {game.price.toLocaleString("fa-IR")}
                                    {" "}
                                    تومان
                                </strong>
                            </div>

                            <div className="booking-summary-total">

                                <div>
                                    <span>مبلغ قابل پرداخت</span>

                                    <small>
                                        {game.price.toLocaleString("fa-IR")}
                                        {" × "}
                                        {quantity.toLocaleString("fa-IR")}
                                        {" نفر"}
                                    </small>
                                </div>

                                <strong>
                                    {totalAmount.toLocaleString("fa-IR")}
                                    {" "}
                                    تومان
                                </strong>

                            </div>

                            <button
                                type="button"
                                className="booking-payment-button"
                                onClick={() => {
                                    console.log({
                                        gameId: game.id,
                                        scheduleId: selectedSchedule.id,
                                        quantity,
                                        amount: totalAmount,
                                    });

                                    alert(
                                        "مرحله اطلاعات مشتری و پرداخت در مرحله بعد اضافه می‌شود."
                                    );
                                }}
                            >
                                ادامه و پرداخت
                                <span>←</span>
                            </button>

                        </div>

                    </section>
                )}

            </div>
        </main>
    );
}