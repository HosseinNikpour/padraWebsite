"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import "./login.css";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!username || !password) {
      setError("نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "ورود ناموفق بود"
        );
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطا در ورود"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">

        <div className="admin-login-logo">
          پادرا
        </div>

        <div className="admin-login-header">
          <span>PADRA ADMIN</span>

          <h1>
            ورود به سامانه
          </h1>

          <p>
            برای ورود به پنل مدیریت، اطلاعات خود را وارد کنید.
          </p>
        </div>

        <form
          className="admin-login-form"
          onSubmit={handleSubmit}
        >

          <div className="admin-login-field">
            <label>
              نام کاربری
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="نام کاربری"
              autoComplete="username"
              dir="ltr"
            />
          </div>

          <div className="admin-login-field">
            <label>
              رمز عبور
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="رمز عبور"
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "در حال ورود..."
              : "ورود به سامانه"}
          </button>

        </form>

      </div>
    </main>
  );
}