"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import { fa } from "@/lib/format";
import { PHONE_ERROR, parsePhone } from "@/lib/phone";

import "./booking.css";

type TargetType = "game" | "event";

type Info = {
    type: TargetType;
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    price: number;
    durationMinutes: number;
    gapMinutes: number;
    minPlayers: number;
    maxPlayers: number;
    openWeekdays: number[];
    windowDays: number;
};

type Slot = {
    startTime: string;
    endTime: string;
    booked: number;
    remaining: number;
    status: "available" | "full" | "past";
    capacity: number;
    minPlayers: number;
    maxPlayers: number;
    price: number;
    durationMinutes: number;
};


function formatPersianDate(dateString: string) {
    return new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${dateString}T00:00:00Z`));
}

type GameLink = { id: number; name: string; price: number };

/** وقتی بدون انتخاب بازی وارد /booking شوند، فهرست بازی‌ها را نشان می‌دهیم. */
function BookingChooser() {
    const [games, setGames] = useState<GameLink[] | null>(null);

    useEffect(() => {
        fetch("/api/games")
            .then((response) => (response.ok ? response.json() : []))
            .then((data: GameLink[]) => setGames(data))
            .catch(() => setGames([]));
    }, []);

    return (
        <main className="booking-page">
            <div className="booking-container">
                <header className="booking-header">
                    <div>
                        <span className="booking-eyebrow">رزرو آنلاین پادرا</span>
                        <h1>کدام بازی را رزرو می‌کنید؟</h1>
                    </div>
                </header>

                <section className="booking-step">
                    {games === null ? (
                        <div className="booking-loading-small">
                            در حال دریافت بازی‌ها...
                        </div>
                    ) : games.length === 0 ? (
                        <div className="booking-empty">
                            <strong>فعلاً بازی‌ای برای رزرو وجود ندارد.</strong>
                        </div>
                    ) : (
                        <div className="booking-schedules">
                            {games.map((game) => (
                                <Link
                                    key={game.id}
                                    href={`/booking?gameId=${game.id}`}
                                    className="booking-schedule"
                                >
                                    <span className="booking-schedule-time">
                                        {game.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

export default function BookingPage() {
    const searchParams = useSearchParams();

    // /booking?gameId=1  یا  /booking?eventId=3
    const gameId = searchParams.get("gameId");
    const eventId = searchParams.get("eventId");
    const queryDate = searchParams.get("date") ?? "";
    const queryStartTime = searchParams.get("startTime") ?? "";

    const type: TargetType | null = eventId ? "event" : gameId ? "game" : null;
    const targetId = Number(eventId ?? gameId);
    const preselectedEventSlot = type === "event" && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) && /^([01]\d|2[0-3]):[0-5]\d$/.test(queryStartTime);

    const [info, setInfo] = useState<Info | null>(null);
    const [infoLoading, setInfoLoading] = useState(true);
    const [error, setError] = useState("");

    const [pickerDate, setPickerDate] = useState<DateObject | null>(null);
    const [selectedDate, setSelectedDate] = useState("");

    const [slots, setSlots] = useState<Slot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedStart, setSelectedStart] = useState("");

    const [quantity, setQuantity] = useState(1);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [customer, setCustomer] = useState<{ id: number; name: string; phone: string } | null>(null);
    const [isStaffUser, setIsStaffUser] = useState(false);
    const [canWalkIn, setCanWalkIn] = useState(false);
    // پرسنلِ دارای دسترسی «ثبت رزرو حضوری»: رزرو بدون پرداخت
    const isWalkIn = isStaffUser && canWalkIn;

    // رزرو حضوری توسط پرسنل (بدون پرداخت)
    const [staffNote, setStaffNote] = useState("");
    const [staffDone, setStaffDone] = useState<string | null>(null);
    const [customerLoaded, setCustomerLoaded] = useState(false);

    // تأیید موبایل مهمان با کد پیامکی
    const [otpToken, setOtpToken] = useState("");
    const [otpPhone, setOtpPhone] = useState(""); // شماره‌ای که توکن برایش صادر شده
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpBusy, setOtpBusy] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpCooldown, setOtpCooldown] = useState(0);

    /* ---------- مشتری واردشده (اختیاری) ---------- */

    useEffect(() => {
        fetch("/api/bookings/identity", { cache: "no-store" })
            .then((response) => response.json())
            .then((data) => {
                setCustomer(data.customer ?? null);
                setIsStaffUser(!!data.staff);
                setCanWalkIn(!!data.canWalkIn);
            })
            .catch(() => setCustomer(null))
            .finally(() => setCustomerLoaded(true));
    }, []);

    async function customerLogout() {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        setCustomer(null);
        setIsStaffUser(false);
        setCanWalkIn(false);
    }

    /* ---------- اطلاعات بازی / ایونت ---------- */

    useEffect(() => {
        if (!type || !Number.isInteger(targetId)) {
            setInfoLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setInfoLoading(true);
                setError("");

                const response = await fetch(
                    `/api/availability/info?type=${type}&id=${targetId}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "مورد موردنظر پیدا نشد");
                }

                if (!cancelled) {
                    setInfo(data);
                    setQuantity(Math.max(1, data.minPlayers));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "خطا در دریافت اطلاعات"
                    );
                }
            } finally {
                if (!cancelled) setInfoLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [type, targetId]);

    useEffect(() => {
        if (preselectedEventSlot) {
            setSelectedDate(queryDate);
            setPickerDate(new DateObject({ date: new Date(`${queryDate}T12:00:00`), calendar: persian, locale: persian_fa }));
            setSelectedStart(queryStartTime);
        }
    }, [preselectedEventSlot, queryDate, queryStartTime]);

    /* ---------- نوبت‌های روز انتخابی (داینامیک از سرور) ---------- */

    const loadSlots = useCallback(async () => {
        if (!type || !selectedDate) return;

        try {
            setSlotsLoading(true);

            const response = await fetch(
                `/api/availability/slots?type=${type}&id=${targetId}&date=${selectedDate}`,
                { cache: "no-store" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "خطا در دریافت نوبت‌ها");
            }

            setSlots(data.slots);
            if (preselectedEventSlot && queryDate === selectedDate) {
                const selected = (data.slots as Slot[]).find((slot) => slot.startTime === queryStartTime && slot.status === "available");
                setSelectedStart(selected ? queryStartTime : "");
                if (!selected) setSubmitError("این سانس دیگر قابل رزرو نیست. لطفاً از صفحه اصلی سانس دیگری انتخاب کنید.");
            }
        } catch (err) {
            console.error("SLOTS LOAD ERROR:", err);
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [type, targetId, selectedDate, preselectedEventSlot, queryDate, queryStartTime]);

    useEffect(() => {
        setSelectedStart("");
        setSubmitError("");

        if (!selectedDate) {
            setSlots([]);
            return;
        }

        loadSlots();
    }, [selectedDate, loadSlots]);

    const selectedSlot = useMemo(
        () => slots.find((slot) => slot.startTime === selectedStart) ?? null,
        [slots, selectedStart]
    );

    const minPlayers = selectedSlot ? selectedSlot.minPlayers : (info ? Math.max(1, info.minPlayers) : 1);

    const maxForSlot = selectedSlot
        ? Math.min(selectedSlot.maxPlayers, selectedSlot.remaining)
        : (info?.maxPlayers ?? 1);

    const quantityOptions = useMemo(() => {
        const options: number[] = [];

        for (let n = minPlayers; n <= maxForSlot; n++) options.push(n);

        return options;
    }, [minPlayers, maxForSlot]);

    useEffect(() => {
        if (quantityOptions.length > 0 && !quantityOptions.includes(quantity)) {
            setQuantity(
                Math.min(
                    Math.max(quantity, quantityOptions[0]),
                    quantityOptions[quantityOptions.length - 1]
                )
            );
        }
    }, [quantityOptions, quantity]);

    function handleDateChange(value: DateObject | DateObject[] | null) {
        const dateObject = Array.isArray(value) ? value[0] : value;

        if (!dateObject) {
            setPickerDate(null);
            setSelectedDate("");
            return;
        }

        setPickerDate(dateObject);

        const date = dateObject.toDate();

        setSelectedDate(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                "0"
            )}-${String(date.getDate()).padStart(2, "0")}`
        );
    }

    const totalAmount = info && selectedSlot ? selectedSlot.price * quantity : 0;

    const phoneVerified = !!otpToken && otpPhone === customerPhone.trim();

    useEffect(() => {
        if (otpCooldown <= 0) return;

        const timer = setTimeout(() => setOtpCooldown((value) => value - 1), 1000);

        return () => clearTimeout(timer);
    }, [otpCooldown]);

    async function sendOtp() {
        setOtpMessage("");
        setSubmitError("");

        if (!parsePhone(customerPhone)) {
            setOtpMessage(PHONE_ERROR);
            return;
        }

        try {
            setOtpBusy(true);

            const response = await fetch("/api/otp/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: customerPhone.trim() }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setOtpMessage(data.error || "ارسال کد ممکن نشد");
                return;
            }

            setOtpSent(true);
            setOtpCode("");
            setOtpCooldown(60);
            setOtpMessage("کد تأیید پیامک شد.");
        } catch {
            setOtpMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید");
        } finally {
            setOtpBusy(false);
        }
    }

    async function verifyOtp() {
        setOtpMessage("");

        if (otpCode.trim().length !== 6) {
            setOtpMessage("کد ۶ رقمی را وارد کنید");
            return;
        }

        try {
            setOtpBusy(true);

            const response = await fetch("/api/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: customerPhone.trim(), code: otpCode.trim() }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.otpToken) {
                setOtpMessage(data.error || "کد صحیح نیست");
                return;
            }

            setOtpToken(data.otpToken);
            setOtpPhone(customerPhone.trim());
            setOtpMessage("");
        } catch {
            setOtpMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید");
        } finally {
            setOtpBusy(false);
        }
    }

    async function submit() {
        if (!info || !selectedSlot) return;

        setSubmitError("");

        // پرسنلِ واردشده: رزرو حضوری بدون پرداخت
        if (isWalkIn) {
            if (customerPhone.trim() && !parsePhone(customerPhone)) {
                setSubmitError(`${PHONE_ERROR} — یا خالی بگذارید`);
                return;
            }

            try {
                setSubmitting(true);

                const response = await fetch("/api/bookings/staff", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: info.type,
                        id: info.id,
                        date: selectedDate,
                        startTime: selectedSlot.startTime,
                        quantity,
                        customerName: customerName.trim(),
                        customerPhone: customerPhone.trim(),
                        note: staffNote.trim(),
                    }),
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    setSubmitError(data.error || "خطا در ثبت رزرو");
                    if (response.status === 409) {
                        await loadSlots();
                        setSelectedStart("");
                    }
                    return;
                }

                setStaffDone(data.trackingCode ?? "ثبت شد");
                setStaffNote("");
                setCustomerName("");
                setCustomerPhone("");
                await loadSlots();
                setSelectedStart("");
            } catch (err) {
                console.error("STAFF BOOKING ERROR:", err);
                setSubmitError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید");
            } finally {
                setSubmitting(false);
            }

            return;
        }

        if (!customer && customerName.trim().length < 2) {
            setSubmitError("نام و نام خانوادگی را وارد کنید");
            return;
        }

        // مهمان، یا کاربر واردشده‌ای که حسابش موبایل ندارد، باید موبایل معتبر وارد کند
        if ((!customer || !customer.phone) && !parsePhone(customerPhone)) {
            setSubmitError(PHONE_ERROR);
            return;
        }

        if (!customer && !phoneVerified) {
            setSubmitError("ابتدا شماره موبایل خود را با کد پیامکی تأیید کنید");
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: info.type,
                    id: info.id,
                    date: selectedDate,
                    startTime: selectedSlot.startTime,
                    quantity,
                    // موبایل همیشه فرستاده می‌شود: سرور موبایل حساب را در اولویت می‌گذارد و فقط وقتی حساب
                    // موبایل ندارد (مثلاً پرسنل) از فرم استفاده می‌کند. نام و کد پیامکی فقط برای مهمان است.
                    customerPhone: customerPhone.trim(),
                    ...(customer ? {} : { customerName: customerName.trim(), otpToken }),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setSubmitError(data.error || "خطا در ثبت رزرو");

                if (data.code === "OTP_REQUIRED") {
                    setOtpToken("");
                    setOtpSent(false);
                }

                // اگر نوبت در این فاصله پر شده، وضعیت جدید را از دیتابیس بخوان
                if (response.status === 409) {
                    await loadSlots();
                    setSelectedStart("");
                }

                return;
            }

            // رزرو رایگان: مستقیم به صفحه‌ی نتیجه
            if (data.free && data.trackingCode) {
                window.location.href = `/booking/result?status=success&code=${encodeURIComponent(data.trackingCode)}`;
                return;
            }

            // انتقال به درگاه پرداخت زرین‌پال
            window.location.href = data.paymentUrl;
        } catch (err) {
            console.error("BOOKING ERROR:", err);
            setSubmitError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید");
        } finally {
            setSubmitting(false);
        }
    }

    /* ---------- حالت‌های کلی صفحه ---------- */

    if (!type) {
        return <BookingChooser />;
    }

    if (infoLoading) {
        return (
            <main className="booking-page">
                <div className="booking-container">
                    <div className="booking-loading">
                        در حال دریافت اطلاعات...
                    </div>
                </div>
            </main>
        );
    }

    if (error || !info) {
        return (
            <main className="booking-page">
                <div className="booking-container">
                    <div className="booking-error">
                        {error || "مورد موردنظر پیدا نشد"}
                    </div>
                </div>
            </main>
        );
    }

    const openDays = new Set(info.openWeekdays);
    const hasSchedule = info.openWeekdays.length > 0;

    return (
        <main className="booking-page">
            <div className="booking-container">

                {/* Header */}
                <header className="booking-header">
                    <div>
                        <span className="booking-eyebrow">
                            رزرو آنلاین پادرا
                        </span>

                        <h1>رزرو {info.name}</h1>

                        <p>
                            تاریخ، نوبت و تعداد نفرات خود را انتخاب کنید.
                        </p>
                    </div>
                </header>

                {/* Info */}
                <section className="booking-game-card">

                    <div className="booking-game-image">
                        {info.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" decoding="async" src={info.image} alt={info.name} />
                        ) : (
                            <span>{info.name}</span>
                        )}
                    </div>

                    <div className="booking-game-info">
                        <h2>{info.name}</h2>

                        {info.description && <p>{info.description}</p>}

                        <div className="booking-info-grid">
                            <div>
                                <small>مدت</small>
                                <strong>{fa(selectedSlot?.durationMinutes ?? info.durationMinutes)} دقیقه</strong>
                            </div>

                            {type === "event" && selectedSlot ? (
                                <div className="booking-capacity">
                                    <small>ظرفیت ایونت</small>
                                    <strong>
                                        {fa(selectedSlot.capacity)} نفر
                                        <span className="booking-capacity-detail">
                                            {" "}· {fa(selectedSlot.booked)} رزرو شده ·{" "}
                                            <b className={selectedSlot.remaining <= 3 ? "is-low" : ""}>
                                                {fa(selectedSlot.remaining)} جای خالی
                                            </b>
                                        </span>
                                    </strong>
                                    <div
                                        className="booking-capacity-bar"
                                        role="progressbar"
                                        aria-label="پُر شدن ظرفیت"
                                        aria-valuemin={0}
                                        aria-valuemax={selectedSlot.capacity}
                                        aria-valuenow={selectedSlot.booked}
                                    >
                                        <span
                                            style={{
                                                width: `${Math.min(100, Math.round((selectedSlot.booked / Math.max(1, selectedSlot.capacity)) * 100))}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <small>ظرفیت هر نوبت</small>
                                    <strong>{fa(selectedSlot?.capacity ?? info.maxPlayers)} نفر</strong>
                                </div>
                            )}

                            <div>
                                <small>قیمت هر نفر</small>
                                <strong>{fa(selectedSlot?.price ?? info.price)} تومان</strong>
                            </div>
                        </div>
                    </div>

                </section>

                {!hasSchedule && !preselectedEventSlot ? (
                    <section className="booking-step">
                        <div className="booking-empty">
                            <strong>
                                در حال حاضر نوبت قابل رزروی تعریف نشده است.
                            </strong>
                            <span>لطفاً بعداً دوباره سر بزنید.</span>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* انتخاب تاریخ فقط برای رزروهای عادی؛ ایونت از صفحه اصلی سانس مشخص دارد */}
                        {!preselectedEventSlot && <section className="booking-step">
                            <div className="booking-step-title">
                                <span>۱</span>

                                <div>
                                    <h2>انتخاب تاریخ</h2>
                                    <p>
                                        روزهایی که نوبت دارند قابل انتخاب‌اند
                                        (تا {fa(info.windowDays)} روز آینده).
                                    </p>
                                </div>
                            </div>

                            <div className="booking-date-quantity">
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
                                        maxDate={new DateObject({
                                            calendar: persian,
                                            locale: persian_fa,
                                        }).add(info.windowDays, "days")}
                                        mapDays={({ date }) => {
                                            const open = openDays.has(
                                                date.toDate().getDay()
                                            );

                                            return open
                                                ? {}
                                                : { disabled: true };
                                        }}
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
                            </div>
                        </section>}

                        {/* Step 2: slots */}
                        {!preselectedEventSlot && selectedDate && (
                            <section className="booking-step">
                                <div className="booking-step-title">
                                    <span>۲</span>

                                    <div>
                                        <h2>انتخاب نوبت</h2>
                                        <p>
                                            نوبت‌های تکمیل‌شده یا گذشته قابل انتخاب نیستند.
                                        </p>
                                    </div>
                                </div>

                                {slotsLoading ? (
                                    <div className="booking-loading-small">
                                        در حال دریافت نوبت‌ها...
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="booking-empty">
                                        <strong>
                                            برای این تاریخ نوبتی وجود ندارد.
                                        </strong>
                                        <span>
                                            لطفاً تاریخ دیگری را انتخاب کنید.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="booking-schedules">
                                        {slots.map((slot) => {
                                            const disabled =
                                                slot.status !== "available";

                                            return (
                                                <button
                                                    type="button"
                                                    key={slot.startTime}
                                                    className={`booking-schedule ${
                                                        selectedStart ===
                                                        slot.startTime
                                                            ? "selected"
                                                            : ""
                                                    } ${
                                                        slot.status === "full"
                                                            ? "is-full"
                                                            : ""
                                                    }`}
                                                    disabled={disabled}
                                                    onClick={() =>
                                                        setSelectedStart(
                                                            slot.startTime
                                                        )
                                                    }
                                                >
                                                    <span className="booking-schedule-time">
                                                        {slot.startTime}
                                                    </span>

                                                    <span className="booking-schedule-separator">
                                                        تا
                                                    </span>

                                                    <span className="booking-schedule-time">
                                                        {slot.endTime}
                                                    </span>

                                                    <span className="booking-schedule-state">
                                                        {slot.status === "full"
                                                            ? "رزرو شده"
                                                            : slot.status === "past"
                                                              ? "گذشته"
                                                              : type === "event"
                                                                ? `${fa(slot.remaining)} جای خالی از ${fa(slot.capacity)}`
                                                                : `${fa(slot.remaining)} نفر ظرفیت`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {preselectedEventSlot && (
                            <section className="booking-step">
                                <div className="booking-step-title"><span>✓</span><div><h2>سانس انتخاب‌شده</h2><p>{formatPersianDate(selectedDate)} · {queryStartTime}{selectedSlot ? ` تا ${selectedSlot.endTime}` : ""}</p></div></div>
                                {!slotsLoading && !selectedSlot && <div className="booking-empty"><strong>این سانس دیگر ظرفیت کافی ندارد.</strong><span>به صفحه اصلی برگرد و سانس دیگری انتخاب کن.</span><Link href="/#today" className="booking-link-button">بازگشت به ایونت‌ها</Link></div>}
                            </section>
                        )}

                        {/* Step 3: details */}
                        {selectedSlot && (
                            <section className="booking-step">
                                <div className="booking-step-title">
                                    <span>۳</span>

                                    <div>
                                        <h2>تعداد نفرات و مشخصات</h2>
                                        <p>اطلاعات رزرو خود را تکمیل کنید.</p>
                                    </div>
                                </div>

                                <div className="booking-date-quantity">
                                    <div className="booking-field">
                                        <label>تعداد نفرات</label>

                                        <select
                                            className="booking-quantity-select"
                                            value={quantity}
                                            onChange={(e) =>
                                                setQuantity(Number(e.target.value))
                                            }
                                        >
                                            {quantityOptions.map((n) => (
                                                <option key={n} value={n}>
                                                    {fa(n)} نفر
                                                </option>
                                            ))}
                                        </select>

                                        <span className="booking-selected-date">
                                            حداقل {fa(minPlayers)} و حداکثر{" "}
                                            {fa(maxForSlot)} نفر
                                        </span>
                                    </div>

                                </div>

                                {/* مشتری: ورود یا مهمان */}
                                {customerLoaded && customer ? (
                                    <>
                                    <div className="booking-customer-box">
                                        <div>
                                            <small>رزرو به نام</small>
                                            <strong>{customer.name}</strong>
                                            {customer.phone ? <span dir="ltr">{customer.phone}</span> : null}
                                            {isStaffUser && <span>(حساب پرسنل)</span>}
                                        </div>

                                        <button type="button" onClick={customerLogout}>
                                            خروج
                                        </button>
                                    </div>

                                    {isStaffUser && !canWalkIn && (
                                        <p className="booking-hint">
                                            حساب شما دسترسی «ثبت رزرو حضوری» ندارد؛ این رزرو مثل مشتری آنلاین و با پرداخت انجام می‌شود. برای رزرو حضوری از مدیر بخواهید این دسترسی را به نقش شما بدهد.
                                        </p>
                                    )}

                                    {isWalkIn && (
                                        <div className="booking-staff-panel">
                                            <p className="booking-guest-title">
                                                ثبت رزرو حضوری برای مشتری (بدون پرداخت آنلاین؛ ظرفیت نوبت بلافاصله کم می‌شود)
                                            </p>

                                            <div className="booking-date-quantity">
                                                <div className="booking-field">
                                                    <label>نام مشتری (اختیاری)</label>
                                                    <input
                                                        className="booking-text-input"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        maxLength={100}
                                                    />
                                                </div>

                                                <div className="booking-field">
                                                    <label>موبایل مشتری (اختیاری)</label>
                                                    <input
                                                        className="booking-text-input"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        inputMode="tel"
                                                        dir="ltr"
                                                        placeholder="09123456789"
                                                    />
                                                </div>
                                            </div>

                                            <div className="booking-field">
                                                <label>توضیحات رزرو (اختیاری)</label>
                                                <textarea
                                                    className="booking-text-input"
                                                    value={staffNote}
                                                    onChange={(e) => setStaffNote(e.target.value)}
                                                    rows={3}
                                                    maxLength={500}
                                                    placeholder="مثلاً: پرداخت نقدی در کافه، همراه با یک کودک ۵ ساله"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!customer.phone && !isWalkIn && (
                                        <div className="booking-field">
                                            <label>شماره موبایل (برای پیگیری رزرو)</label>
                                            <input
                                                className="booking-text-input"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                inputMode="tel"
                                                dir="ltr"
                                                autoComplete="tel"
                                            />
                                        </div>
                                    )}
                                    </>
                                ) : (
                                    customerLoaded && (
                                        <>
                                            <div className="booking-customer-box booking-customer-box--guest">
                                                <div>
                                                    <strong>حساب کاربری دارید؟</strong>
                                                    <span>
                                                        با ورود، رزروهایتان در پروفایل ذخیره می‌شود.
                                                    </span>
                                                </div>

                                                <Link
                                                    href={`/account?next=${encodeURIComponent(
                                                        `/booking${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
                                                    )}`}
                                                >
                                                    ورود / ثبت‌نام
                                                </Link>
                                            </div>

                                            <p className="booking-guest-title">
                                                یا بدون ثبت‌نام، به‌عنوان مهمان ادامه دهید:
                                            </p>

                                            <div className="booking-date-quantity">
                                            <div className="booking-field">
                                                <label>نام و نام خانوادگی</label>

                                                <input
                                                    className="booking-text-input"
                                                    value={customerName}
                                                    onChange={(e) =>
                                                        setCustomerName(e.target.value)
                                                    }
                                                    maxLength={60}
                                                    autoComplete="name"
                                                />
                                            </div>

                                            <div className="booking-field">
                                                <label>شماره موبایل</label>

                                                <input
                                                    className="booking-text-input"
                                                    value={customerPhone}
                                                    onChange={(e) =>
                                                        setCustomerPhone(e.target.value)
                                                    }
                                                    placeholder="09123456789"
                                                    inputMode="tel"
                                                    dir="ltr"
                                                    autoComplete="tel"
                                                />
                                            </div>
                                            </div>

                                            <div className="booking-otp" aria-live="polite">
                                                {phoneVerified ? (
                                                    <p className="booking-otp-ok">✓ شماره موبایل تأیید شد</p>
                                                ) : (
                                                    <>
                                                        {otpSent && (
                                                            <div className="booking-field">
                                                                <label htmlFor="booking-otp-code">کد تأیید پیامک‌شده</label>

                                                                <div className="booking-otp-row">
                                                                    <input
                                                                        id="booking-otp-code"
                                                                        className="booking-text-input"
                                                                        value={otpCode}
                                                                        onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                                                                        inputMode="numeric"
                                                                        autoComplete="one-time-code"
                                                                        dir="ltr"
                                                                        placeholder="------"
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        className="booking-otp-button"
                                                                        onClick={verifyOtp}
                                                                        disabled={otpBusy}
                                                                    >
                                                                        تأیید کد
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="booking-otp-button booking-otp-button--ghost"
                                                            onClick={sendOtp}
                                                            disabled={otpBusy || otpCooldown > 0}
                                                        >
                                                            {otpCooldown > 0
                                                                ? `ارسال دوباره تا ${otpCooldown} ثانیه دیگر`
                                                                : otpSent
                                                                  ? "ارسال دوباره‌ی کد"
                                                                  : "ارسال کد تأیید به موبایل"}
                                                        </button>
                                                    </>
                                                )}

                                                {otpMessage && <p className="booking-otp-msg">{otpMessage}</p>}
                                            </div>
                                        </>
                                    )
                                )}

                                <div className="booking-summary">
                                    <div className="booking-summary-row">
                                        <span>
                                            {info.type === "game" ? "بازی" : "ایونت"}
                                        </span>
                                        <strong>{info.name}</strong>
                                    </div>

                                    <div className="booking-summary-row">
                                        <span>تاریخ</span>
                                        <strong>
                                            {formatPersianDate(selectedDate)}
                                        </strong>
                                    </div>

                                    <div className="booking-summary-row">
                                        <span>نوبت</span>
                                        <strong>
                                            {selectedSlot.startTime} تا{" "}
                                            {selectedSlot.endTime}
                                        </strong>
                                    </div>

                                    <div className="booking-summary-total">
                                        <div>
                                            <span>مبلغ</span>
                                            <small>
                                                {fa(selectedSlot.price)} × {fa(quantity)} نفر
                                            </small>
                                        </div>

                                        <strong>{fa(totalAmount)} تومان</strong>
                                    </div>

                                    {isWalkIn ? (
                                        <p className="booking-hint">
                                            رزرو حضوری: پرداخت آنلاین ندارد، بلافاصله قطعی می‌شود و در «رزروها» با برچسب «حضوری» و توضیحات شما ثبت می‌گردد.
                                        </p>
                                    ) : (
                                        <p className="booking-hint">
                                            پس از انتخاب، به درگاه امن زرین‌پال منتقل می‌شوید. ظرفیت نوبت تا ۲۰ دقیقه برای شما نگه داشته می‌شود و پس از پرداخت موفق، کد رهگیری پیامک می‌شود.
                                        </p>
                                    )}

                                    {staffDone && (
                                        <div className="booking-staff-done" role="status">
                                            ✓ رزرو حضوری ثبت شد (کد رهگیری: <b dir="ltr">{staffDone}</b>). ظرفیت نوبت به‌روز شد.{" "}
                                            <Link href="/admin/bookings">مشاهده در لیست رزروها</Link>
                                        </div>
                                    )}

                                    {submitError && (
                                        <div className="booking-error" role="alert">
                                            {submitError}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="booking-payment-button"
                                        onClick={submit}
                                        disabled={submitting}
                                    >
                                        {isWalkIn
                                            ? submitting
                                                ? "در حال ثبت..."
                                                : "ثبت رزرو حضوری (بدون پرداخت)"
                                            : submitting
                                              ? "در حال انتقال به درگاه..."
                                              : "پرداخت و ثبت نهایی"}
                                        <span>←</span>
                                    </button>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
