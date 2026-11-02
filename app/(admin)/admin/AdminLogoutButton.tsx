"use client";

import { useState } from "react";

export default function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);

    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

    window.location.href = "/account";
  }

  return (
    <button
      type="button"
      className="admin-logout"
      onClick={logout}
      disabled={loading}
    >
      {loading ? "..." : "خروج"}
    </button>
  );
}
