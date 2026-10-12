import type { ReactNode } from "react";
import "./crud-theme.css";

type CrudPageProps = {
  eyebrow: string;
  title: string;
  description?: string;
  count?: number;
  countLabel?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared outer shell for admin CRUD pages. Keep data/API logic in each page. */
export function CrudPage({
  eyebrow, title, description, count, countLabel, headerAction, children, className = "",
}: CrudPageProps) {
  return (
    <main className={`crud-page ${className}`} dir="rtl">
      <header className="crud-page__header">
        <div className="crud-page__heading">
          <span className="crud-page__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="crud-page__header-side">
          {count !== undefined && (
            <div className="crud-page__count"><strong>{count}</strong><span>{countLabel || "مورد"}</span></div>
          )}
          {headerAction}
        </div>
      </header>
      <div className="crud-page__content">{children}</div>
    </main>
  );
}

export function CrudColumns({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`crud-columns ${className}`}>{children}</div>;
}

export function CrudCard({ title, description, actions, children, className = "" }: {
  title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`crud-card ${className}`}>
      <header className="crud-card__header">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {actions && <div className="crud-card__actions">{actions}</div>}
      </header>
      <div className="crud-card__body">{children}</div>
    </section>
  );
}

export function CrudField({ label, children, hint, className = "" }: {
  label: string; children: ReactNode; hint?: string; className?: string;
}) {
  return <div className={`crud-field ${className}`}><label>{label}</label>{children}{hint && <small>{hint}</small>}</div>;
}


/** Responsive grid for CRUD forms: three fields per row on wide screens, two on medium, one on mobile. */
export function CrudFormGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`crud-form-grid crud-form-grid--page ${className}`}>{children}</div>;
}
