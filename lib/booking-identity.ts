import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { parsePhone } from "@/lib/phone";

export type BookingIdentity = {
  id: number;
  name: string;
  /** ممکن است برای پرسنل خالی باشد (حسابشان موبایل ندارد) */
  phone: string;
  staff: boolean;
  /** پرسنلی که اجازه‌ی ثبت رزرو حضوری (بدون پرداخت) دارد */
  canWalkIn: boolean;
};

/**
 * هویت واردشده برای رزرو در صفحه‌ی عمومی: مشتری، یا پرسنلی که با حساب خودش وارد شده است.
 * در هر دو حالت نیازی به وارد کردن نام و تأیید پیامکی موبایل نیست.
 */
export async function getBookingIdentity(): Promise<BookingIdentity | null> {
  const customer = await getCurrentCustomer();

  if (customer) {
    return { id: customer.id, name: customer.name, phone: customer.phone, staff: false, canWalkIn: false };
  }

  const user = await getCurrentUser();

  if (user) {
    return {
      id: user.id,
      name: user.name,
      phone: parsePhone(user.phone) ?? "",
      staff: true,
      canWalkIn: hasPermission(user, "bookings.create") || hasPermission(user, "bookings.manage"),
    };
  }

  return null;
}
