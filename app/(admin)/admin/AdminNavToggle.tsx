"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * دکمه‌ی همبرگری و پس‌زمینه‌ی تیره برای منوی کشویی پنل ادمین در موبایل.
 * وضعیت باز/بسته با کلاس `admin-nav-open` روی `.admin-shell` اعمال می‌شود
 * تا لایه‌ی سرور (layout) بدون تغییر بماند.
 */
export default function AdminNavToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // با رفتن به صفحه‌ی دیگر منو بسته شود
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document
      .querySelector(".admin-shell")
      ?.classList.toggle("admin-nav-open", open);

    return () => {
      document.querySelector(".admin-shell")?.classList.remove("admin-nav-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="admin-menu-button"
        aria-label={open ? "بستن منو" : "باز کردن منو"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className="admin-backdrop"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
    </>
  );
}
