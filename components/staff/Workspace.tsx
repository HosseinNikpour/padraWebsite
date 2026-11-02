"use client";

import type { ReactNode } from "react";

import "@/components/staff/staff.css";

/**
 * اجزای مشترک صفحه‌های کاری پرسنل (وظایف، مرخصی، شیفت) — همان الگوی صفحه‌ی رزروها:
 *   تب‌ها (فقط وقتی بیش از یک مورد باشد) ← نوار جست‌وجو + دکمه‌ی «ایجاد جدید» ← پنل ایجاد ← جدول/باکس موارد.
 */

export type WorkTab<T extends string> = { key: T; label: string; badge?: number };

export function WorkTabs<T extends string>({ tabs, value, onChange }: { tabs: WorkTab<T>[]; value: T; onChange: (key: T) => void }) {
  if (tabs.length < 2) return null;

  return (
    <div className="st-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" role="tab" aria-selected={tab.key === value} className={tab.key === value ? "active" : ""} onClick={() => onChange(tab.key)}>
          {tab.label}
          {tab.badge ? <span>{tab.badge.toLocaleString("fa-IR")}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function WorkToolbar({
  search,
  onSearch,
  searchPlaceholder = "جست‌وجو در همه‌ی ستون‌ها...",
  actionLabel,
  onAction,
  actionOpen,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionOpen?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="ws-toolbar">
      {onSearch && (
        <input className="st-input ws-search" type="search" value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} aria-label="جست‌وجو" />
      )}
      {children}
      {actionLabel && onAction && (
        <button type="button" className="crud-button ws-action" onClick={onAction} aria-expanded={!!actionOpen}>
          {actionOpen ? "× بستن فرم" : `+ ${actionLabel}`}
        </button>
      )}
    </div>
  );
}

export function CreatePanel({ open, title, description, children }: { open: boolean; title: string; description?: string; children: ReactNode }) {
  if (!open) return null;

  return (
    <section className="ws-panel" aria-label={title}>
      <h3>{title}</h3>
      {description && <p className="st-note">{description}</p>}
      {children}
    </section>
  );
}

export type Column<Row> = { key: string; label: string; render: (row: Row) => ReactNode };

export function DataTable<Row>({ columns, rows, rowKey, empty = "موردی پیدا نشد." }: { columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string | number; empty?: string }) {
  if (rows.length === 0) return <div className="crud-empty">{empty}</div>;

  return (
    <div className="crud-table-wrap">
      <table className="crud-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
