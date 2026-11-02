import Link from "next/link";

import { CrudPage } from "@/components/admin/crud/CrudPage";

import "./menu-hub.css";

const sections = [
  {
    href: "/admin/menu/categories",
    icon: "☰",
    title: "دسته‌بندی‌ها",
    description: "افزودن، ویرایش و مدیریت دسته‌بندی‌های منو",
    action: "مدیریت دسته‌بندی‌ها ←",
  },
  {
    href: "/admin/menu/items",
    icon: "🍔",
    title: "آیتم‌های منو",
    description: "افزودن، ویرایش و مدیریت غذاها و نوشیدنی‌ها",
    action: "مدیریت آیتم‌ها ←",
  },
];

export default function MenuAdminPage() {
  return (
    <CrudPage
      eyebrow="PADRA MENU"
      title="مدیریت منو"
      description="مدیریت دسته‌بندی‌ها و آیتم‌های منوی کافه"
    >
      <div className="menu-hub">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="menu-hub__card">
            <span className="menu-hub__icon">{section.icon}</span>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span className="menu-hub__action">{section.action}</span>
          </Link>
        ))}
      </div>
    </CrudPage>
  );
}
