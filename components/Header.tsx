"use client";

import { useEffect, useState } from "react";
import "./header.css";

const menuItems = [
  { label: "خانه", href: "#home" },
  
  { label: "بازی‌ها", href: "#games" },
  { label: "ایونت ها", href: "#today" },
  { label: "کافه", href: "#cafe" },
  { label: "تولد", href: "#birthday" },
  // { label: "جام و لیگ", href: "#cup" },
  // { label: "آرشیو عکس و فیلم", href: "#archive" },
  { label: "درباره ما", href: "#about" },

];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.5 3.5 2.8 10.7c-.8.3-.8 1.4 0 1.7l4.8 1.7 1.8 5.6c.2.7 1.1.9 1.6.4l2.7-2.7 4.8 3.5c.6.4 1.4.1 1.6-.6l3.1-15.5c.2-.9-.7-1.6-1.7-1.3Z" />
      <path
        d="m8 14 9.5-7-7.2 8.5"
        fill="none"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 3.5 9.5 3c.6-.1 1.1.2 1.3.8l1 2.8c.2.5 0 .9-.4 1.3L10 9.2c1 2 2.7 3.7 4.8 4.8l1.3-1.4c.3-.3.8-.5 1.3-.3l2.8 1c.6.2.9.7.8 1.3l-.5 2.3c-.2.8-.9 1.4-1.7 1.4C10.2 18.3 5.7 13.8 5.7 7.2c0-.8.6-1.5 1.5-1.7Z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 5h5.5c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5H13" />
      <path d="M3.5 12h10" />
      <path d="m10 8.5 3.5 3.5-3.5 3.5" />
    </svg>
  );
}
export default function Header() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  // وضعیت ورود: پرسنل → پنل مدیریت، مشتری → پروفایل، مهمان → ورود
  const [session, setSession] = useState<{ type: "staff" | "customer" | null }>({ type: null });

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSession({ type: data.type ?? null }))
      .catch(() => setSession({ type: null }));
  }, []);

  const accountLink =
    session.type === "staff"
      ? { label: "پنل مدیریت", href: "/admin" }
      : session.type === "customer"
        ? { label: "حساب من", href: "/profile" }
        : { label: "ورود / ثبت‌نام", href: "/account" };

  const navItems = [...menuItems, accountLink];

  return (
    <header className="site-header">
      <div className="header-inner">

        <a
          href="#home"
          className="logo"
          onClick={closeMenu}
        >
       <span>پادراپارک</span>
        </a>

        <nav className="desktop-nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-icons">

          <a
            href="https://www.instagram.com/padrapark.hamila?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw=="
            className="header-icon"
            aria-label="اینستاگرام"
            target="_blank"  rel="noopener noreferrer"
          >
            <InstagramIcon />
          </a>

          <a
            href="https://t.me/padraEvents"
            className="header-icon"
            aria-label="تلگرام"
            target="_blank"  rel="noopener noreferrer"
          >
            <TelegramIcon />
          </a>

          <a
            href="tel:09386620999"
            className="header-icon"
            aria-label="تلفن"
          >
            <PhoneIcon />
          </a>

          <a href="https://nshn.ir/b9_bv2vAQxM5Xs" aria-label="آدرس" target="_blank"  rel="noopener noreferrer" className="header-icon">
            <MapPinIcon />
          </a>
 <a
            href={accountLink.href}
            className="header-icon"
            aria-label={accountLink.label}
          >
            <LoginIcon />
          </a>
        </div>

        <button
          className="mobile-menu-button"
          onClick={() => setOpen(!open)}
          aria-label="باز کردن منو"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

      </div>

      {open && (
        <nav className="mobile-nav">

          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </a>
          ))}
<a
  href={accountLink.href}
  onClick={closeMenu}
  className="mobile-account-link"
>
  <LoginIcon />
  <span>{accountLink.label}</span>
</a>
          <div className="mobile-header-icons">

            <a href="#" aria-label="اینستاگرام">
              <InstagramIcon />
            </a>

            <a href="#" aria-label="تلگرام">
              <TelegramIcon />
            </a>

            <a href="tel:09386620999" aria-label="تماس" >
              <PhoneIcon />
            </a>

            <a href="https://nshn.ir/b9_bv2vAQxM5Xs" aria-label="آدرس" target="_blank"  rel="noopener noreferrer">
              <MapPinIcon />
            </a>

          </div>

        </nav>
      )}
    </header>
  );
}