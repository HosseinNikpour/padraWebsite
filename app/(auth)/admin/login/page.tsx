import { redirect } from "next/navigation";

/** ورود پرسنل و مشتری یکی شده است؛ این آدرس فقط برای لینک‌های قدیمی نگه داشته شده. */
export default function AdminLoginRedirect() {
  redirect("/account?next=/admin");
}
