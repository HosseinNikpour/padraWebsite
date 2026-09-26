import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const permissions = new Set(
    user.role.permissions.map(
      (item) => item.permission.code
    )
  );

  const hasPermission = (permission: string) => {
    return permissions.has(permission);
  };

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
            <span>⌂</span>
            داشبورد
          </Link>

          {/* Games */}
          {hasPermission("games.view") && (
            <>
              <div className="admin-nav-title">
                بازی‌ها
              </div>

              <Link
                href="/admin/games"
                className="admin-nav-item"
              >
                <span>◈</span>
                بازی‌ها
              </Link>
            </>
          )}

          {/* Schedules */}
          {hasPermission("schedules.view") && (
            <Link
              href="/admin/schedules"
              className="admin-nav-item"
            >
              <span>◷</span>
              زمان‌بندی بازی‌ها
            </Link>
          )}

          {/* Bookings */}
          {hasPermission("bookings.view") && (
            <Link
              href="/admin/bookings"
              className="admin-nav-item"
            >
              <span>▣</span>
              رزروها
            </Link>
          )}

          {/* Events */}
          {hasPermission("events.view") && (
            <>
              <div className="admin-nav-title">
                رویدادها
              </div>

              <Link
                href="/admin/events"
                className="admin-nav-item"
              >
                <span>◆</span>
                رویدادها
              </Link>
            </>
          )}

          {/* Menu */}
          {hasPermission("menu.view") && (
            <>
              <div className="admin-nav-title">
                منو
              </div>

              {hasPermission("menu.manage") && (
                <>
                  <Link
                    href="/admin/menu/categories"
                    className="admin-nav-item"
                  >
                    <span>▦</span>
                    دسته‌بندی‌ها
                  </Link>

                  <Link
                    href="/admin/menu/items"
                    className="admin-nav-item"
                  >
                    <span>☰</span>
                    آیتم‌های منو
                  </Link>
                </>
              )}
            </>
          )}

          {/* Users */}
          {hasPermission("users.view") && (
            <>
              <div className="admin-nav-title">
                مدیریت سیستم
              </div>

              <Link
                href="/admin/users"
                className="admin-nav-item"
              >
                <span>♙</span>
                کاربران
              </Link>
            </>
          )}

          {/* Roles */}
          {hasPermission("roles.view") && (
            <Link
              href="/admin/roles"
              className="admin-nav-item"
            >
              <span>⚙</span>
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

          <div>
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

        </header>

        <div className="admin-content">
          {children}
        </div>

      </main>
    </div>
  );
}