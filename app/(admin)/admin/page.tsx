import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";


export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

 const permissions = new Set(
  user.role.permissions.map(
    (item: { permission: { code: string } }) => item.permission.code
  )
);

  const hasPermission = (permission: string) => {
    return permissions.has(permission);
  };

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginTop: "25px",
        }}
      >

        {/* Games */}
        {hasPermission("games.view") && (
          <AdminCard
            icon="◈"
            title="بازی‌ها"
            description="مدیریت و مشاهده بازی‌های مجموعه"
            href="/admin/games"
          />
        )}

        {/* Schedules */}
        {hasPermission("schedules.view") && (
          <AdminCard
            icon="◷"
            title="زمان‌بندی بازی‌ها"
            description="مدیریت برنامه و سانس‌های بازی"
            href="/admin/schedules"
          />
        )}

        {/* Bookings */}
        {hasPermission("bookings.view") && (
          <AdminCard
            icon="▣"
            title="رزروها"
            description="مشاهده و مدیریت رزروهای مجموعه"
            href="/admin/bookings"
          />
        )}

        {/* Events */}
        {hasPermission("events.view") && (
          <AdminCard
            icon="◆"
            title="رویدادها"
            description="مدیریت رویدادها و برنامه‌های مجموعه"
            href="/admin/events"
          />
        )}

        {/* Menu Categories */}
        {hasPermission("menu.view") &&
          hasPermission("menu.manage") && (
            <AdminCard
              icon="▦"
              title="دسته‌بندی‌های منو"
              description="افزودن و ویرایش دسته‌بندی‌های منو"
              href="/admin/menu/categories"
            />
          )}

        {/* Menu Items */}
        {hasPermission("menu.view") &&
          hasPermission("menu.manage") && (
            <AdminCard
              icon="☰"
              title="آیتم‌های منو"
              description="مدیریت محصولات و قیمت‌های کافه"
              href="/admin/menu/items"
            />
          )}

        {/* Users */}
        {hasPermission("users.view") && (
          <AdminCard
            icon="♙"
            title="کاربران"
            description="مدیریت کاربران سامانه"
            href="/admin/users"
          />
        )}

        {/* Roles */}
        {hasPermission("roles.view") && (
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