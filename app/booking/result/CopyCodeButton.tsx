"use client";

import { useState } from "react";

/** کپی کد رهگیری با یک لمس (در موبایل کاربر معمولاً نیاز دارد کد را ذخیره کند). */
export default function CopyCodeButton({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }

    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button type="button" className="acc-button acc-button--ghost" onClick={copy} aria-live="polite">
      {state === "copied" ? "کپی شد ✓" : state === "failed" ? "کپی نشد؛ دستی کپی کنید" : "کپی کد رهگیری"}
    </button>
  );
}
