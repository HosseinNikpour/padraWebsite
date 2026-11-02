export const fa = (n: number) => n.toLocaleString("fa-IR");

/** «شنبه ۲۵ مهر ۱۴۰۵» از «YYYY-MM-DD» (بدون وابستگی به منطقه‌ی زمانی) */
export function formatPersianDate(date: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "پرداخت‌شده",
  PENDING: "در انتظار پرداخت",
  EXPIRED: "منقضی شده",
  CANCELLED: "لغو شده",
};

/** «۲۵ مهر ۱۴۰۵، ۱۴:۳۰» از یک لحظه‌ی زمانی (ISO)، به وقت تهران */
export function formatDateTimeFa(iso: string | Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));
}
