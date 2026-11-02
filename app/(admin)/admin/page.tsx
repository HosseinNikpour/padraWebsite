import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, hasPermission } from "@/lib/auth";
import StaffInbox from "@/components/staff/StaffInbox";


export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/account?next=/admin");
  }
  const can = (permission: string) => hasPermission(user, permission);

  return (
    <div>

      <div className="admin-page-header">
        <div>
          <h1>داشبورد</h1>

          <p>
            خوش آمدید {user.name}؛
            شما با نقش «{user.role.name}» وارد شده‌اید.
          </p>
        </div>
      </div>

      <StaffInbox />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginTop: "25px",
        }}
      >

        <AdminCard icon="✓" title="کارتابل و تسک‌ها" description="مشاهده تسک‌ها، پیگیری انجام و ایجاد تسک برای پرسنل" href="/admin/tasks" />

        {/* Staff requests */}
        {(can("leave.approve.supervisor") || can("leave.approve.final") || can("shifts.swap.approve")) && (
          <AdminCard icon="▤" title="درخواست‌های در انتظار" description="بررسی و تأیید مرخصی‌ها و تغییر شیفت‌ها" href="/admin/leaves" />
        )}

        {/* Games */}
        {can("games.view") && (
          <AdminCard
            icon="◈"
            title="بازی‌ها"
            description="مدیریت و مشاهده بازی‌های مجموعه"
            href="/admin/games"
          />
        )}

        {/* Schedules */}
        {can("schedules.view") && (
          <AdminCard
            icon="◷"
            title="زمان‌بندی و نوبت‌ها"
            description="برنامه‌ی هفتگی و نوبت‌های بازی‌ها و ایونت‌ها"
            href="/admin/schedules"
          />
        )}

        {/* Bookings */}
        {can("bookings.view") && (
          <AdminCard
            icon="▣"
            title="رزروها"
            description="مشاهده و مدیریت رزروهای مجموعه"
            href="/admin/bookings"
          />
        )}

        {/* Events */}
        {can("events.view") && (
          <AdminCard
            icon="◆"
            title="رویدادها"
            description="مدیریت رویدادها و برنامه‌های مجموعه"
            href="/admin/events"
          />
        )}

        {/* Menu Categories */}
        {can("menu.view") &&
          can("menu.manage") && (
            <AdminCard
              icon="▦"
              title="دسته‌بندی‌های منو"
              description="افزودن و ویرایش دسته‌بندی‌های منو"
              href="/admin/menu/categories"
            />
          )}

        {/* Menu Items */}
        {can("menu.view") &&
          can("menu.manage") && (
            <AdminCard
              icon="☰"
              title="آیتم‌های منو"
              description="مدیریت محصولات و قیمت‌های کافه"
              href="/admin/menu/items"
            />
          )}

        {/* Users */}
        {can("users.view") && (
          <AdminCard
            icon="♙"
            title="کاربران"
            description="مدیریت کاربران سامانه"
            href="/admin/users"
          />
        )}

        {/* Roles */}
        {can("roles.view") && (
          <AdminCard
            icon="⚙"
            title="نقش‌ها و دسترسی‌ها"
            description="مدیریت نقش‌ها و سطح دسترسی کاربران"
            href="/admin/roles"
          />
        )}

      </div>

    </div>
  );
}

function AdminCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        background: "#fff",
        border: "1px solid #e4edf6",
        borderRadius: "16px",
        padding: "25px",
        color: "#123E73",
        boxShadow:
          "0 5px 20px rgba(18,62,115,0.05)",
        transition: "all .2s",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "13px",
          background: "#edf5fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          marginBottom: "18px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: "17px",
          fontWeight: 800,
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#7b8da3",
          fontSize: "12px",
          lineHeight: 1.8,
        }}
      >
        {description}
      </div>
    </Link>
  );
}