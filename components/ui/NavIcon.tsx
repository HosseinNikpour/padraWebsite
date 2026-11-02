import type { ReactElement } from "react";

/** آیکون‌های SVG محلی (بدون وابستگی خارجی) برای ناوبری؛ برای screen reader مخفی‌اند (متن کنار آن‌ها خوانده می‌شود). */
const PATHS: Record<string, ReactElement> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  tasks: <path d="M9 11l2 2 4-4M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />,
  leave: <path d="M3 12l18-8-6 17-3-7-9-2z" />,
  shifts: <path d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" />,
  attendance: <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />,
  key: <path d="M14 10a4 4 0 11-3.9 3H3v-3h3v-2h2.1A4 4 0 0114 10zM15.5 9.5h.01" />,
  game: <path d="M6 9h12a3 3 0 013 3l-1 5a2 2 0 01-3.4 1L15 16H9l-1.6 2A2 2 0 014 17l-1-5a3 3 0 013-3zM8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01" />,
  schedule: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5h4" />,
  bookings: <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 000-4V7zM14 5v14" />,
  events: <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8L7 19l1-5.7-4-4 5.5-.8z" />,
  category: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  users: <path d="M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M16 4.5a3.5 3.5 0 010 6.5M22 20a6 6 0 00-4-5.6" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />,
};

export type NavIconName = keyof typeof PATHS;

export default function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      className="admin-nav-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
