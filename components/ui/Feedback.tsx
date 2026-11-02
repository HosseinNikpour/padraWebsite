"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import "./feedback.css";

type ToastKind = "info" | "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };
type ConfirmState = { message: string; confirmLabel: string; cancelLabel: string; danger: boolean; resolve: (value: boolean) => void };

type ConfirmOptions = { confirmLabel?: string; cancelLabel?: string; danger?: boolean };

type FeedbackApi = {
  /** جایگزین window.confirm: Promise<boolean> */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  /** جایگزین window.alert: پیام کوتاه و خودبسته‌شونده (نوع از متن حدس زده می‌شود مگر مشخص شود) */
  toast: (message: string, kind?: ToastKind) => void;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

const ERROR_HINT = /خطا|نشد|نامعتبر|معتبر نیست|نمی‌توان|ناموفق|فقط|نباید|وارد کنید|انتخاب کنید|الزامی/;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmState | null>(null);
  const nextId = useRef(1);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const toast = useCallback((message: string, kind?: ToastKind) => {
    const id = nextId.current++;
    const resolved = kind ?? (ERROR_HINT.test(message) ? "error" : "info");

    setToasts((list) => [...list.slice(-3), { id, message, kind: resolved }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), resolved === "error" ? 6000 : 4000);
  }, []);

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) => {
        lastFocused.current = document.activeElement as HTMLElement | null;
        setDialog({
          message,
          confirmLabel: options.confirmLabel ?? "تأیید",
          cancelLabel: options.cancelLabel ?? "انصراف",
          danger: options.danger ?? /حذف|لغو/.test(message),
          resolve,
        });
      }),
    []
  );

  const close = useCallback(
    (value: boolean) => {
      setDialog((current) => {
        current?.resolve(value);

        return null;
      });
      lastFocused.current?.focus?.();
    },
    []
  );

  useEffect(() => {
    if (!dialog) return;

    confirmButton.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const api = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <div className="fb-toasts" role="status" aria-live="polite" dir="rtl">
        {toasts.map((item) => (
          <div key={item.id} className={`fb-toast fb-toast--${item.kind}`}>
            {item.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="fb-overlay" dir="rtl" onMouseDown={(event) => event.target === event.currentTarget && close(false)}>
          <div className="fb-dialog" role="alertdialog" aria-modal="true" aria-describedby="fb-dialog-message">
            <p id="fb-dialog-message">{dialog.message}</p>

            <div className="fb-actions">
              <button type="button" className="fb-btn fb-btn--ghost" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                ref={confirmButton}
                type="button"
                className={`fb-btn ${dialog.danger ? "fb-btn--danger" : "fb-btn--primary"}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);

  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");

  return ctx;
}
