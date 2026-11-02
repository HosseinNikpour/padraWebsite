import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, hasPermission } from "@/lib/auth";
// import type { Permission } from "@prisma/client";
import NavIcon from "@/components/ui/NavIcon";
import AdminLogoutButton from "./AdminLogoutButton";
import AdminNavToggle from "./AdminNavToggle";
import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/account?next=/admin");
  }
  const can = (permission: string) => hasPermission(user, permission);

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">

        {/* Logo */}
        <div className="admin-logo">
          <div className="admin-logo-icon">
            پ
          </div>

          <div>
            <div className="admin-logo-title">
              پادراپارک
            </div>

            <div className="admin-logo-subtitle">
              مدیریت مجموعه
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">

          {/* Dashboard */}
          <Link
            href="/admin"
            className="admin-nav-item"
          >
            <NavIcon name="home" />
            داشبورد
          </Link>

          {/* Staff self-service: همه‌ی پرسنل */}
          <div className="admin-nav-title">
            پرسنل
          </div>

          <Link href="/admin/tasks" className="admin-nav-item">
            <NavIcon name="tasks" />
            کارتابل و تسک‌ها
          </Link>

          <Link href="/admin/leaves" className="admin-nav-item">
            <NavIcon name="leave" />
            مرخصی
          </Link>

          <Link href="/admin/shifts" className="admin-nav-item">
            <NavIcon name="shifts" />
            شیفت‌های کاری
          </Link>

          <Link href="/admin/attendance" className="admin-nav-item">
            <NavIcon name="attendance" />
            کارکرد و حضور و غیاب
          </Link>

          <Link href="/admin/profile" className="admin-nav-item">
            <NavIcon name="user" />
            پروفایل من
          </Link>
          <Link href="/admin/password" className="admin-nav-item">
            <NavIcon name="key" />
            تغییر رمز عبور
          </Link>

          {/* Games */}
          {can("games.view") && (
            <>
              <div className="admin-nav-title">
                بازی‌ها
              </div>

              <Link
                href="/admin/games"
                className="admin-nav-item"
              >
                <NavIcon name="game" />
                بازی‌ها
              </Link>
            </>
          )}

          {/* Schedules */}
          {can("schedules.view") && (
            <Link
              href="/admin/schedules"
              className="admin-nav-item"
            >
              <NavIcon name="schedule" />
              زمان‌بندی و نوبت‌ها
            </Link>
          )}

          {/* Bookings */}
          {can("bookings.view") && (
            <Link
              href="/admin/bookings"
              className="admin-nav-item"
            >
              <NavIcon name="bookings" />
              رزروها
            </Link>
          )}

          {/* Events */}
          {can("events.view") && (
            <>
              <div className="admin-nav-title">
                رویدادها
              </div>

              <Link
                href="/admin/events"
                className="admin-nav-item"
              >
                <NavIcon name="events" />
                رویدادها
              </Link>
            </>
          )}

          {/* Menu */}
          {can("menu.view") && (
            <>
              <div className="admin-nav-title">
                منو
              </div>

              {can("menu.manage") && (
                <>
                  <Link
                    href="/admin/menu/categories"
                    className="admin-nav-item"
                  >
                    <NavIcon name="category" />
                    دسته‌بندی‌ها
                  </Link>

                  <Link
                    href="/admin/menu/items"
                    className="admin-nav-item"
                  >
                    <NavIcon name="menu" />
                    آیتم‌های منو
                  </Link>
                </>
              )}
            </>
          )}

          {/* Users */}
          {can("users.view") && (
            <>
              <div className="admin-nav-title">
                مدیریت سیستم
              </div>

              <Link
                href="/admin/users"
                className="admin-nav-item"
              >
                <NavIcon name="users" />
                کاربران
              </Link>
            </>
          )}

          {/* Roles */}
          {can("roles.view") && (
            <Link
              href="/admin/roles"
              className="admin-nav-item"
            >
              <NavIcon name="settings" />
              نقش‌ها و دسترسی‌ها
            </Link>
          )}

        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-status-dot" />
          سیستم فعال است
        </div>

      </aside>

      <main className="admin-main">

        <header className="admin-topbar">

          <AdminNavToggle />

          <div className="admin-topbar-text">
            <div className="admin-topbar-title">
              پنل مدیریت
            </div>

            <div className="admin-topbar-subtitle">
              {user.name} · {user.role.name}
            </div>
          </div>

          <Link
            href="/menu"
            target="_blank"
            className="admin-view-menu"
          >
            مشاهده منوی مشتری ↗
          </Link>

          <AdminLogoutButton />

        </header>

        <div className="admin-content">
          {children}
        </div>

      </main>
    </div>
  );
}